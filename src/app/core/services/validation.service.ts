import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, of, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { ApiErrorResponse } from '../auth/auth-api.model';
import {
  ExternalCheck,
  Gender,
  IdentityDocumentType,
  PreValidationOpinion,
  PreValidationResult,
  ProfessionalCategory,
  StepDecision,
  StepResubmission,
  StoredFile,
  ValidationDetail,
  ValidationProfile,
  ValidationStatus,
  ValidationStep,
  ValidationStepStatus,
  ValidationStepType,
  ValidationSummary,
} from '../models';

type StatusValidacaoApi = 'PENDENTE' | 'APROVADO' | 'REPROVADO';
type StatusEtapaApi = 'PENDENTE' | 'APROVADA' | 'REPROVADA';
type ParecerApi = 'FAVORAVEL' | 'DESFAVORAVEL' | 'INDISPONIVEL' | 'SEM_API';
type PerfilApi = 'PACIENTE' | 'PROFISSIONAL';

interface ArquivoApi {
  nomeArquivo: string;
  contentType: string;
  tamanhoBytes: number | null;
  enviadoEm: string | null;
  url: string | null;
}

interface EtapaApi {
  id: number;
  tipo: ValidationStepType;
  descricao: string;
  status: StatusEtapaApi;
  justificativa: string | null;
  documento: ArquivoApi | null;
  anexo: ArquivoApi | null;
  avaliadoPor: string | null;
  avaliadoEm: string | null;
  criadoEm: string;
  historico: EtapaApi[];
}

interface DadosCadastraisApi {
  nome: string;
  email: string;
  telefone: string | null;
  avatarUrl: string | null;
  cpf: string;
  dataNascimento: string;
  genero: Gender;
  documentoIdentidadeTipo: IdentityDocumentType | null;
  documentoIdentidadeNumero: string | null;
  documentoIdentidadeUf: string | null;
  cep: string;
  logradouro: string;
  numero: string;
  complemento: string | null;
  bairro: string;
  cidade: string;
  uf: string;
  categoria: ProfessionalCategory | null;
  especialidades: string[] | null;
  cnpj: string | null;
  registroProfissional: string | null;
  registroProfissionalUf: string | null;
}

interface ValidacaoDetalheApi {
  id: number;
  perfil: PerfilApi;
  statusValidacao: StatusValidacaoApi;
  cadastradoEm: string;
  dados: DadosCadastraisApi;
  etapas: EtapaApi[];
}

interface ValidacaoResumoApi {
  id: number;
  perfil: PerfilApi;
  nome: string;
  email: string;
  categoria: ProfessionalCategory | null;
  statusValidacao: StatusValidacaoApi;
  cadastradoEm: string;
  etapasPendentes: number;
}

interface VerificacaoApi {
  campo: string;
  provedor: string | null;
  parecer: ParecerApi;
  motivos: string[];
  observacoes: string[];
}

interface PreValidacaoApi {
  tipo: ValidationStepType;
  parecer: ParecerApi;
  verificacoes: VerificacaoApi[];
  sugestaoJustificativa: string;
  consultadoEm: string;
}

/** Validação cadastral: fila e decisões do admin, e acompanhamento/reenvio do próprio usuário. */
@Injectable({ providedIn: 'root' })
export class ValidationService {
  private readonly http = inject(HttpClient);
  private readonly adminUrl = `${environment.apiUrl}/admin/validacoes`;
  private readonly selfUrl = `${environment.apiUrl}/validacao`;

  /** Sem `status`, traz todos os cadastros do perfil. */
  list(profile: ValidationProfile, status?: ValidationStatus): Observable<ValidationSummary[]> {
    const params = status ? { status: toStatusApi(status) } : undefined;
    return this.http.get<ValidacaoResumoApi[]>(`${this.adminUrl}/${adminSegment(profile)}`, { params }).pipe(
      map((response) => response.map(toSummary)),
      catchError((error: unknown) => throwError(() => normalizeError(error, 'Não foi possível carregar os cadastros.'))),
    );
  }

  getForAdmin(profile: ValidationProfile, id: string): Observable<ValidationDetail | undefined> {
    return this.http.get<ValidacaoDetalheApi>(`${this.adminUrl}/${adminSegment(profile)}/${id}`).pipe(
      map(toDetail),
      catchError((error: unknown) => {
        if (error instanceof HttpErrorResponse && error.status === 404) {
          return of(undefined);
        }
        return throwError(() => normalizeError(error, 'Não foi possível carregar o cadastro.'));
      }),
    );
  }

  decide(profile: ValidationProfile, id: string, step: ValidationStepType, input: StepDecision): Observable<ValidationDetail> {
    const formData = new FormData();
    formData.append(
      'dados',
      new Blob(
        [JSON.stringify({ decisao: input.decision === 'aprovada' ? 'APROVADA' : 'REPROVADA', justificativa: input.justification })],
        { type: 'application/json' },
      ),
    );
    if (input.attachment) {
      formData.append('anexo', input.attachment, input.attachment.name);
    }

    return this.http
      .post<ValidacaoDetalheApi>(`${this.adminUrl}/${adminSegment(profile)}/${id}/etapas/${step}/decisao`, formData)
      .pipe(
        map(toDetail),
        catchError((error: unknown) => throwError(() => normalizeError(error, 'Não foi possível registrar a decisão.'))),
      );
  }

  preValidate(profile: ValidationProfile, id: string, step: ValidationStepType): Observable<PreValidationResult> {
    return this.http
      .post<PreValidacaoApi>(`${this.adminUrl}/${adminSegment(profile)}/${id}/etapas/${step}/pre-validacao`, {})
      .pipe(
        map(toPreValidation),
        catchError((error: unknown) => throwError(() => normalizeError(error, 'Não foi possível fazer a pré-validação.'))),
      );
  }

  getMine(profile: ValidationProfile): Observable<ValidationDetail> {
    return this.http.get<ValidacaoDetalheApi>(`${this.selfUrl}/${selfSegment(profile)}`).pipe(
      map(toDetail),
      catchError((error: unknown) =>
        throwError(() => normalizeError(error, 'Não foi possível carregar a validação do seu cadastro.')),
      ),
    );
  }

  resubmit(profile: ValidationProfile, step: ValidationStepType, input: StepResubmission): Observable<ValidationDetail> {
    const dados = {
      nome: input.name,
      cpf: input.cpf,
      documentoIdentidadeTipo: input.identityDocumentType,
      documentoIdentidadeNumero: input.identityDocumentNumber,
      documentoIdentidadeUf: input.identityDocumentUf || undefined,
      cnpj: input.cnpj,
      registroProfissional: input.registrationNumber,
      registroProfissionalUf: input.registrationUf,
    };

    const formData = new FormData();
    formData.append('dados', new Blob([JSON.stringify(dados)], { type: 'application/json' }));
    formData.append('documento', input.document, input.document.name);

    return this.http
      .post<ValidacaoDetalheApi>(`${this.selfUrl}/${selfSegment(profile)}/etapas/${step}/reenvio`, formData)
      .pipe(
        map(toDetail),
        catchError((error: unknown) => throwError(() => normalizeError(error, 'Não foi possível reenviar a etapa.'))),
      );
  }
}

function adminSegment(profile: ValidationProfile): string {
  return profile === 'patient' ? 'pacientes' : 'profissionais';
}

function selfSegment(profile: ValidationProfile): string {
  return profile === 'patient' ? 'paciente' : 'profissional';
}

function toStatusApi(status: ValidationStatus): StatusValidacaoApi {
  return status.toUpperCase() as StatusValidacaoApi;
}

export function toValidationStatus(status: StatusValidacaoApi): ValidationStatus {
  return status.toLowerCase() as ValidationStatus;
}

function toProfile(perfil: PerfilApi): ValidationProfile {
  return perfil === 'PACIENTE' ? 'patient' : 'professional';
}

function toFile(arquivo: ArquivoApi | null): StoredFile | null {
  if (!arquivo) {
    return null;
  }
  return {
    fileName: arquivo.nomeArquivo,
    contentType: arquivo.contentType,
    sizeBytes: arquivo.tamanhoBytes,
    sentAt: arquivo.enviadoEm,
    url: arquivo.url,
  };
}

function toStep(etapa: EtapaApi): ValidationStep {
  return {
    id: String(etapa.id),
    type: etapa.tipo,
    label: etapa.descricao,
    status: etapa.status.toLowerCase() as ValidationStepStatus,
    justification: etapa.justificativa,
    document: toFile(etapa.documento),
    attachment: toFile(etapa.anexo),
    reviewedBy: etapa.avaliadoPor,
    reviewedAt: etapa.avaliadoEm,
    createdAt: etapa.criadoEm,
    history: etapa.historico.map(toStep),
  };
}

function toDetail(response: ValidacaoDetalheApi): ValidationDetail {
  const dados = response.dados;
  return {
    id: String(response.id),
    profile: toProfile(response.perfil),
    status: toValidationStatus(response.statusValidacao),
    registeredAt: response.cadastradoEm,
    data: {
      name: dados.nome,
      email: dados.email,
      phone: dados.telefone,
      avatarUrl: dados.avatarUrl,
      cpf: dados.cpf,
      birthDate: dados.dataNascimento,
      gender: dados.genero,
      identityDocumentType: dados.documentoIdentidadeTipo,
      identityDocumentNumber: dados.documentoIdentidadeNumero,
      identityDocumentUf: dados.documentoIdentidadeUf,
      address: {
        cep: dados.cep,
        street: dados.logradouro,
        number: dados.numero,
        complement: dados.complemento ?? undefined,
        neighborhood: dados.bairro,
        city: dados.cidade,
        state: dados.uf,
      },
      category: dados.categoria,
      specialties: dados.especialidades ?? [],
      cnpj: dados.cnpj,
      registrationNumber: dados.registroProfissional,
      registrationUf: dados.registroProfissionalUf,
    },
    steps: response.etapas.map(toStep),
  };
}

function toSummary(response: ValidacaoResumoApi): ValidationSummary {
  return {
    id: String(response.id),
    profile: toProfile(response.perfil),
    name: response.nome,
    email: response.email,
    category: response.categoria,
    status: toValidationStatus(response.statusValidacao),
    registeredAt: response.cadastradoEm,
    pendingSteps: response.etapasPendentes,
  };
}

function toOpinion(parecer: ParecerApi): PreValidationOpinion {
  return parecer === 'SEM_API' ? 'sem-api' : (parecer.toLowerCase() as PreValidationOpinion);
}

function toCheck(verificacao: VerificacaoApi): ExternalCheck {
  return {
    field: verificacao.campo,
    provider: verificacao.provedor,
    opinion: toOpinion(verificacao.parecer),
    reasons: verificacao.motivos,
    notes: verificacao.observacoes,
  };
}

function toPreValidation(response: PreValidacaoApi): PreValidationResult {
  return {
    stepType: response.tipo,
    opinion: toOpinion(response.parecer),
    checks: response.verificacoes.map(toCheck),
    suggestedJustification: response.sugestaoJustificativa,
    checkedAt: response.consultadoEm,
  };
}

function normalizeError(error: unknown, defaultMessage: string): Error {
  if (error instanceof HttpErrorResponse) {
    const apiError = error.error as ApiErrorResponse | undefined;
    return new Error(apiError?.message ?? defaultMessage);
  }
  return error instanceof Error ? error : new Error(defaultMessage);
}
