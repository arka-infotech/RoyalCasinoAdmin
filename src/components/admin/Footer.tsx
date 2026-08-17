import { APP_NAME } from "@/lib/appConfig";

export default function Footer() {
  return (
    <footer className="mt-8 border-t border-indigo-100 bg-white px-6 py-4 text-sm text-gray-600">
      <p>© {new Date().getFullYear()} {APP_NAME}. All rights reserved.</p>
    </footer>
  );
}
