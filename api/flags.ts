const PADRAO = { displayPreValidacao: true };

function responder(corpo: { displayPreValidacao: boolean }): Response {
  return Response.json(corpo, { headers: { 'Cache-Control': 'no-store' } });
}

export default {
  async fetch(): Promise<Response> {
    try {
      const { flagsClient } = await import('@vercel/flags-core');
      const resultado = await flagsClient.evaluate<boolean>(
        'displayPreValidacao',
        true,
      );
      if (resultado.errorMessage) {
        console.error(
          'Flag displayPreValidacao indisponível:',
          resultado.errorMessage,
        );
      }
      return responder({ displayPreValidacao: resultado.value !== false });
    } catch (erro) {
      console.error('Falha ao avaliar as flags:', erro);
      return responder(PADRAO);
    }
  },
};
