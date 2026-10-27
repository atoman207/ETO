import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-kinari px-6 text-center">
      <div className="font-mincho text-6xl font-bold text-ai-800">404</div>
      <p className="mt-4 text-base font-bold text-stone-800">お探しのページが見つかりませんでした</p>
      <p className="mt-1 text-sm text-stone-500">URLが変更されたか、データが削除された可能性があります。</p>
      <Link href="/" className="mt-6 rounded-md bg-ai-700 px-5 py-2 text-sm font-medium text-white hover:bg-ai-800">
        ダッシュボードへ戻る
      </Link>
    </div>
  );
}
