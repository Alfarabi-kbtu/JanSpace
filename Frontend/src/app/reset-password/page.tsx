import { ResetPasswordForm } from "./reset-password-form";

export default async function ResetPasswordPage(props: PageProps<"/reset-password">) {
  const searchParams = await props.searchParams;
  const uid = typeof searchParams.uid === "string" ? searchParams.uid : "";
  const token = typeof searchParams.token === "string" ? searchParams.token : "";

  return (
    <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center px-6 py-16">
      <h1 className="mb-6 text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
        Новый пароль
      </h1>
      <ResetPasswordForm uid={uid} token={token} />
    </div>
  );
}
