import { Resend, type CreateEmailOptions } from 'resend';
import ENV from './env.server';
import z from 'zod';

const resend = new Resend(ENV.RESEND_KEY);

type EmailResult = { success: true } | { success: false; error: string };

type EmailOptions = Omit<CreateEmailOptions, 'bcc' | 'cc' | 'from' | 'to' | 'replyTo'>;

export const sendEmail = async (to: string, props: EmailOptions): Promise<EmailResult> => {
	const { data: recipientEmail } = z.email().safeParse(to);
	if (!recipientEmail) return { success: false, error: 'Invalid recipient' };

	try {
		const res = await resend.emails.send({
			from: ENV.EMAIL_FROM,
			to: recipientEmail,
			...props,
		} as CreateEmailOptions);

		if (res.error) {
			console.warn(res.error);
			return { success: false, error: 'Unable to send email' };
		}

		return { success: true };
	} catch (err) {
		console.warn(err);
		return { success: false, error: 'Unable to send email' };
	}
};
