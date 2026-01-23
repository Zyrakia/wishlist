import ENV from '$lib/env';
import { createMistral } from '@ai-sdk/mistral';
import { embed, embedMany, type EmbeddingModel } from 'ai';
import { Err, Ok } from 'ts-results-es';

import { DomainError } from '../util/service';

import { createService } from '../util/service';

const modelHost = createMistral({ apiKey: ENV.MISTRAL_AI_KEY });
const embeddingModel = modelHost.textEmbedding('mistral-embed');

/** Maximum input length for embedding generation (Mistral limit). */
export const EMBEDDING_MAX_INPUT = 8192;

export const EmbeddingService = createService(embeddingModel, {
	/**
	 * Generates an embedding for a single text value.
	 *
	 * @param value the text to embed
	 */
	generate: async (model, value: string) => {
		if (value.length > EMBEDDING_MAX_INPUT) {
			return Err(
				DomainError.of(`Input exceeds max length (${value.length}/${EMBEDDING_MAX_INPUT})`),
			);
		}

		const { embedding } = await embed({ model, value });
		return Ok(embedding);
	},

	/**
	 * Generates embeddings for multiple text values.
	 *
	 * @param values the texts to embed
	 */
	generateMany: async (model, values: string[]) => {
		if (values.length === 0) return Ok([]);

		const oversized = values.find((v) => v.length > EMBEDDING_MAX_INPUT);
		if (oversized) {
			return Err(
				DomainError.of(
					`Input exceeds max length (${oversized.length}/${EMBEDDING_MAX_INPUT})`,
				),
			);
		}

		const { embeddings } = await embedMany({ model, values });
		return Ok(embeddings);
	},

	/**
	 * Converts an embedding to a buffer for storage.
	 *
	 * @param embedding the embedding to convert
	 */
	toBuffer: async (_model, embedding: number[]) => {
		return Ok(Buffer.from(new Float32Array(embedding).buffer));
	},
});
