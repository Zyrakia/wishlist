import { form } from '$app/server';
import { createInsertSchema } from 'drizzle-zod';
import { WishlistItemTable } from '../db/schema';

const ItemSchema = createInsertSchema(WishlistItemTable, {
	name: (v) => v.nonempty().transform((v) => v.trim()),
	notes: (v) => v.transform((v) => v.trim()),
	imageUrl: (v) => v.transform((v) => v.trim()),
	url: (v) => v.transform((v) => v.trim()),
}).omit({
	id: true,
	createdAt: true,
	wishlistId: true,
});

export const createItem = form(ItemSchema, (data) => {
    
});
