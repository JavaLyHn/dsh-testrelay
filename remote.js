import { createTypertRemoteInfo } from '@deepseek-ai/dsh-typert-protocol/remote-info';
import { z } from 'zod';

export const PACKAGE_NAME = '@local/dsh-api-testbench';
const endpoint = 'apiTestbench/perform';

const requestSchema = () => z.strictObject({
  sessionId: z.string().min(1),
  action: z.string().min(1),
  payload: z.record(z.string(), z.json()),
});
const resultSchema = () => z.record(z.string(), z.json());
const requestJsonSchema = {
  type: 'object',
  properties: {
    sessionId: { type: 'string', description: 'The originating DSH session; supplied by the UI, never by the model.' },
    action: { type: 'string' },
    payload: { type: 'object', additionalProperties: true },
  },
  required: ['sessionId', 'action', 'payload'],
  additionalProperties: false,
};

const requestCodec = {
  mode: 'strict',
  typeSymbol: `${PACKAGE_NAME}#ApiRequest`,
  create: requestSchema,
  jsonSchema: requestJsonSchema,
};

export const TYPERT_REMOTE = createTypertRemoteInfo({
  package: PACKAGE_NAME,
  methods: {
    [endpoint]: {
      service: 'apiTestbench',
      description: 'Read API Testbench state or perform one explicitly initiated, session-scoped UI action.',
      invocation: { kind: 'direct' },
      parameters: [{
        name: 'request',
        source: 'json',
        description: 'A Client UI command bound to its originating session.',
        codec: requestCodec,
        strictCodec: requestCodec,
      }],
      cancellation: { parameter: 'signal' },
      result: {
        mode: 'strict',
        typeSymbol: `${PACKAGE_NAME}#ApiValue`,
        create: resultSchema,
        description: 'JSON-safe API Testbench result; all stored request and response content is redacted before return.',
        jsonSchema: { type: 'object', additionalProperties: true },
      },
    },
  },
}, z);
