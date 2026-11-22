import { flagsClient } from '@vercel/flags-core';

export default {
  async fetch(): Promise<Response> {
    const displayPreValidacao = await flagsClient.evaluate<boolean>('displayPreValidacao', true);
    return Response.json(
      { displayPreValidacao: displayPreValidacao.value !== false },
      { headers: { 'Cache-Control': 'no-store' } },
    );
  },
};
