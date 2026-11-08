import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, Signal, computed, inject, signal } from '@angular/core';
import { Observable, of, throwError } from 'rxjs';
import { catchError, map, tap } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { normalizeError } from '../http/api-error';
import { AtuacaoApi, toPracticeArea } from './practice-area.service';
import {
  ExternalCheck,
  Gender,
  IdentityDocumentType,
  PreValidationOpinion,
  PreValidationResult,
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

export type StatusValidacaoApi = 'PENDENTE' | 'APROVADO' | 'REPROVADO';
type StatusEtapaApi = 'PENDENTE' | 'APROVADA' | 'REPROVADA';
type ParecerApi = 'FAVORAVEL' | 'DESFAVORAVEL' | 'INDISPONIVEL' | 'SEM_API';
type PerfilApi = 'PACIENTE' | 'PROFISSIONAL';

interface ArquivoApi {
  nomeArquivo: string;
  contentType: string;
  tamanhoBytes: number | null;
  enviadoEm: string | null;
  caminho: string | null;
}

interface EtapaApi {
  id: number;
  tipo: ValidationStepType;
  descricao: string;
  atuacao: AtuacaoApi | null;
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
  atuacoes: AtuacaoApi[] | null;
  cnpj: string | null;
}

interface ValidacaoDetalheApi {
  id: number;
  perfil: PerfilApi;
  statusValidacao: StatusValidacaoApi;
  emRevalidacao: boolean;
  bloqueiaCriacao: boolean;
  cadastradoEm: string;
  dados: DadosCadastraisApi;
  etapas: EtapaApi[];
}

interface ValidacaoResumoApi {
  id: number;
  perfil: PerfilApi;
  nome: string;
  email: string;
  atuacoes: string[] | null;
  statusValidacao: StatusValidacaoApi;
  emRevalidacao: boolean;
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

@Injectable({ providedIn: 'root' })
export class ValidationService {
  private readonly http = inject(HttpClient);
  private readonly adminUrl = `${environment.apiUrl}/admin/validacoes`;
  private readonly selfUrl = `${environment.apiUrl}/validacao`;
  private readonly revalidating = signal<Partial<Record<ValidationProfile, boolean>>>({});

  list(profile: ValidationProfile, filter?: ValidationStatus | 'revalidacao'): Observable<ValidationSummary[]> {
    const params: Record<string, string> =
      filter === 'revalidacao' ? { emRevalidacao: 'true' } : filter ? { status: toStatusApi(filter) } : {};
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

  decide(profile: ValidationProfile, id: string, step: ValidationStep, input: StepDecision): Observable<ValidationDetail> {
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
      .post<ValidacaoDetalheApi>(`${this.adminUrl}/${adminSegment(profile)}/${id}/etapas/${step.type}/decisao`, formData, {
        params: practiceAreaParam(step.practiceArea?.id),
      })
      .pipe(
        map(toDetail),
        catchError((error: unknown) => throwError(() => normalizeError(error, 'Não foi possível registrar a decisão.'))),
      );
  }

  preValidate(profile: ValidationProfile, id: string, step: ValidationStep): Observable<PreValidationResult> {
    return this.http
      .post<PreValidacaoApi>(`${this.adminUrl}/${adminSegment(profile)}/${id}/etapas/${step.type}/pre-validacao`, {}, {
        params: practiceAreaParam(step.practiceArea?.id),
      })
      .pipe(
        map(toPreValidation),
        catchError((error: unknown) => throwError(() => normalizeError(error, 'Não foi possível fazer a pré-validação.'))),
      );
  }

  revalidatingFor(profile: ValidationProfile): Signal<boolean> {
    this.getMine(profile)
      .pipe(catchError(() => of(null)))
      .subscribe();
    return computed(() => this.revalidating()[profile] ?? false);
  }

  getMine(profile: ValidationProfile): Observable<ValidationDetail> {
    return this.http.get<ValidacaoDetalheApi>(`${this.selfUrl}/${selfSegment(profile)}`).pipe(
      map(toDetail),
      tap((detail) => this.rememberRevalidation(profile, detail)),
      catchError((error: unknown) =>
        throwError(() => normalizeError(error, 'Não foi possível carregar a validação do seu cadastro.')),
      ),
    );
  }

  resubmit(
    profile: ValidationProfile,
    step: ValidationStepType,
    input: StepResubmission,
    practiceAreaId?: string,
  ): Observable<ValidationDetail> {
    const dados = {
      cpf: input.cpf,
      documentoIdentidadeTipo: input.identityDocumentType,
      documentoIdentidadeNumero: input.identityDocumentNumber,
      documentoIdentidadeUf: input.identityDocumentUf || undefined,
      dataNascimento: input.birthDate,
      genero: input.gender,
      cnpj: input.cnpj,
      registroProfissional: input.registrationNumber,
      registroProfissionalUf: input.registrationUf,
    };

    const formData = new FormData();
    formData.append('dados', new Blob([JSON.stringify(dados)], { type: 'application/json' }));
    if (input.document) {
      formData.append('documento', input.document, input.document.name);
    }

    return this.http
      .post<ValidacaoDetalheApi>(`${this.selfUrl}/${selfSegment(profile)}/etapas/${step}/reenvio`, formData, {
        params: practiceAreaParam(practiceAreaId),
      })
      .pipe(
        map(toDetail),
        tap((detail) => this.rememberRevalidation(profile, detail)),
        catchError((error: unknown) => throwError(() => normalizeError(error, 'Não foi possível enviar para validação.'))),
      );
  }

  private rememberRevalidation(profile: ValidationProfile, detail: ValidationDetail): void {
    this.revalidating.update((current) => ({ ...current, [profile]: detail.creationLocked }));
  }
}

function practiceAreaParam(practiceAreaId: string | undefined): Record<string, string> {
  return practiceAreaId ? { atuacao: practiceAreaId } : {};
}

export function stepKey(type: ValidationStepType, practiceAreaId: string | null | undefined): string {
  return practiceAreaId ? `${type}:${practiceAreaId}` : type;
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
    url: null,
    path: arquivo.caminho ?? undefined,
  };
}

function toStep(etapa: EtapaApi): ValidationStep {
  const practiceArea = etapa.atuacao ? toPracticeArea(etapa.atuacao) : null;
  return {
    id: String(etapa.id),
    key: stepKey(etapa.tipo, practiceArea?.id),
    type: etapa.tipo,
    label: etapa.descricao,
    practiceArea,
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
    revalidating: response.emRevalidacao === true,
    creationLocked: response.bloqueiaCriacao === true,
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
      practiceAreas: (dados.atuacoes ?? []).map(toPracticeArea),
      cnpj: dados.cnpj,
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
    practiceAreas: response.atuacoes ?? [],
    status: toValidationStatus(response.statusValidacao),
    revalidating: response.emRevalidacao === true,
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
