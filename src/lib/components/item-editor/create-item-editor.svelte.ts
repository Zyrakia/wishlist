import { createItem, generateItem, updateItem } from '$lib/remotes/item.remote';
import { ItemSchema, type Item } from '$lib/schemas/item';

export type Mode = 'edit' | 'create';
export type Init = { item?: Partial<Item>; mode: Mode; placeholder?: Partial<Item> };

export const createItemEditor = (init: Init) => {
	const isCreate = init.mode === 'create';

	const remote = (isCreate ? createItem : updateItem).preflight(ItemSchema);
	const genRemote = generateItem.preflight(ItemSchema.pick({ url: true }));

	const placeholderProperties: Partial<Item> = init.placeholder ?? {
		name: 'New Item',
		notes: '',
		price: 19.99,
		priceCurrency: 'USD',
		url: 'https://example.com',
		imageUrl: 'https://placehold.co/1080x720?text=Item+Image&font=roboto',
	};

	let enteredProperties = $state<Partial<Item>>(init.item ?? {});
	const previewProperties = $derived.by(() => {
		if (isCreate) return { ...placeholderProperties, ...enteredProperties };
		else return { ...enteredProperties };
	});

	let isGenerateDone = $state(false);
	let generateError = $state('');
	const isGenerating = $derived(!!genRemote.pending);

	const isFormValid = $derived(remote.fields.issues() === undefined);

	const getIssue = (field: { issues(): { message: string }[] | undefined }) =>
		field.issues()?.[0]?.message;

	const onFieldInput = (name: keyof Item, value: unknown) => {
		const schema = ItemSchema.shape[name];

		const { success, data } = schema.safeParse(value);
		if (!success) return;

		if (data === null) delete enteredProperties[name];
		else (enteredProperties[name] as any) = data;

		remote.validate({ preflightOnly: true });
	};

	const adoptSeed = (data: Partial<Item>) => {
		if (Object.keys(data).length) {
			remote.fields.set(data as any);
			enteredProperties = data;
			remote.validate({ preflightOnly: true });
		}
	};

	return {
		mode: init.mode,
		remote,
		genRemote,
		placeholderProperties,
		enteredProperties,
		previewProperties,
		isFormValid,
		isGenerating,
		isGenerateDone,
		generateError,
		getIssue,
		onFieldInput,
		adoptSeed,
	};
};

export type ItemEditor = ReturnType<typeof createItemEditor>;
