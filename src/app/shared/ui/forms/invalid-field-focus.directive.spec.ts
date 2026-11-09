import { revealFirstInvalid } from './invalid-field-focus.directive';

describe('revealFirstInvalid', () => {
  function form(html: string): HTMLFormElement {
    const element = document.createElement('form');
    element.innerHTML = html;
    document.body.appendChild(element);
    return element;
  }

  afterEach(() => document.querySelectorAll('form').forEach((element) => element.remove()));

  it('vai até a seção inválida que fica antes, mesmo fora dos campos do formulário', () => {
    const element = form(`
      <div id="documentos" data-invalid="true"><input type="file" /></div>
      <input id="endereco" formcontrolname="cep" class="ng-invalid" />
    `);
    const documents = element.querySelector('#documentos') as HTMLElement;
    spyOn(documents, 'scrollIntoView');

    revealFirstInvalid(element);

    expect(documents.scrollIntoView).toHaveBeenCalled();
  });

  it('com o formulário válido, só os documentos faltando já levam até eles', () => {
    const element = form(`
      <input formcontrolname="nome" class="ng-valid" />
      <div id="documentos" data-invalid="true"><input type="file" /></div>
    `);
    const documents = element.querySelector('#documentos') as HTMLElement;
    spyOn(documents, 'scrollIntoView');

    revealFirstInvalid(element, false);

    expect(documents.scrollIntoView).toHaveBeenCalled();
  });

  it('sem nada inválido, não rola', () => {
    const element = form(`<p role="alert">aviso</p><input formcontrolname="nome" class="ng-valid" />`);
    const alert = element.querySelector('p') as HTMLElement;
    spyOn(alert, 'scrollIntoView');

    revealFirstInvalid(element, false);

    expect(alert.scrollIntoView).not.toHaveBeenCalled();
  });
});
