import { EmailList } from "@/components/mail/email-list";

export default function MailPage() {
  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-normal text-zinc-950">
          Mail
        </h1>
        <p className="mt-1 max-w-2xl text-sm leading-6 text-zinc-500">
          Paste customer emails, keep them tied to project work, and extract
          reply-ready actions with AI.
        </p>
      </div>

      <EmailList />
    </div>
  );
}
