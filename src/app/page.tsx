import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { COOKIE_NAME } from '@/lib/auth';

export default async function Home() {
  const cookieStore = await cookies();
  const hasAuth = Boolean(cookieStore.get(COOKIE_NAME)?.value);
  redirect(hasAuth ? '/dashboard' : '/login');
}
