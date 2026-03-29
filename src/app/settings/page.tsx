import { requireUser } from "@/lib/auth";
import { TelegramLinkCard } from "@/components/telegram-link-card";
import { getTelegramLinkStatus } from "@/lib/telegram";
import { NotificationSettings } from "@/components/notification-settings";
import { BaseCurrencySettings } from "@/components/base-currency-settings";
import { TwoFactorSettings } from "@/components/two-factor-settings";
import { AuditLogViewer } from "@/components/audit-log-viewer";
import { db } from "@/lib/db";

export default async function SettingsPage() {
  const user = await requireUser();

  const telegramLink = await getTelegramLinkStatus(user.id);
  const botConfigured = !!process.env.TELEGRAM_BOT_TOKEN;
  const fullUser = await db.user.findUnique({
    where: { id: user.id },
    select: { reminderDays: true, baseCurrency: true },
  });

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-6">
        Settings
      </h1>

      <div className="space-y-6">
        {/* Profile section */}
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
            Profile
          </h2>
          <dl className="space-y-3">
            <div>
              <dt className="text-sm text-gray-500 dark:text-gray-400">Name</dt>
              <dd className="text-gray-900 dark:text-gray-100">{user.name}</dd>
            </div>
            <div>
              <dt className="text-sm text-gray-500 dark:text-gray-400">Email</dt>
              <dd className="text-gray-900 dark:text-gray-100">{user.email}</dd>
            </div>
          </dl>
        </div>

        {/* Base currency preference */}
        <BaseCurrencySettings
          initialBaseCurrency={fullUser?.baseCurrency ?? "USD"}
        />

        {/* Two-Factor Authentication */}
        <TwoFactorSettings />

        {/* Notifications section */}
        <NotificationSettings
          initialReminderDays={fullUser?.reminderDays ?? null}
        />

        {/* Security Audit Log */}
        <AuditLogViewer />

        {/* Telegram section */}
        <TelegramLinkCard
          linked={!!telegramLink}
          username={telegramLink?.username ?? null}
          linkedAt={telegramLink?.createdAt?.toISOString() ?? null}
          botConfigured={botConfigured}
        />
      </div>
    </div>
  );
}
