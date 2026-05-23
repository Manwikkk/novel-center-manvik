'use client';

import { useEffect, useState } from 'react';
import AuthGuard from '@/components/layout/AuthGuard';
import DashboardShell from '@/components/layout/DashboardShell';
import DashboardTopbar from '@/components/layout/DashboardTopbar';
import Avatar from '@/components/ui/Avatar';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import TextInput from '@/components/ui/TextInput';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/authStore';
import { useUiStore } from '@/stores/uiStore';

function formFromUser(u) {
  return {
    displayName: u?.displayName || '',
    bio: u?.bio || '',
    avatarUrl: u?.avatarUrl || '',
  };
}

function AuthorSettings() {
  const user = useAuthStore((s) => s.user);
  const setUser = useAuthStore((s) => s.setUser);
  const pushToast = useUiStore((s) => s.pushToast);
  const [form, setForm] = useState(() => formFromUser(user));
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setForm(formFromUser(user));
  }, [user]);

  function update(key, value) {
    setForm((f) => ({ ...f, [key]: value }));
    setErrors((e) => ({ ...e, [key]: undefined }));
  }

  function validate() {
    const next = {};
    const dn = form.displayName.trim();
    if (dn.length < 2 || dn.length > 80) {
      next.displayName = 'Display name must be 2–80 characters.';
    }
    if (form.bio && form.bio.length > 2000) {
      next.bio = 'Bio must be 2000 characters or fewer.';
    }
    if (form.avatarUrl) {
      try {
        const u = new URL(form.avatarUrl);
        if (!/^https?:$/.test(u.protocol)) next.avatarUrl = 'Use an http(s) URL.';
      } catch (_e) {
        next.avatarUrl = 'Enter a valid URL.';
      }
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!validate()) return;
    setSaving(true);
    try {
      const data = await api.patch('/auth/me', {
        displayName: form.displayName.trim(),
        bio: form.bio.trim(),
        avatarUrl: form.avatarUrl.trim(),
      });
      setUser(data.user);
      pushToast({ type: 'success', title: 'Profile saved' });
    } catch (err) {
      pushToast({ type: 'error', title: 'Could not save', message: err.message });
    } finally {
      setSaving(false);
    }
  }

  function handleReset() {
    setForm(formFromUser(user));
    setErrors({});
  }

  return (
    <DashboardShell kind="author">
      <DashboardTopbar
        subtitle="Author studio"
        title="Settings"
      />
      <div className="px-4 md:px-edge py-8 max-w-4xl space-y-10">
        <section className="grid md:grid-cols-3 gap-6">
          <div>
            <p className="label-sm uppercase text-on-surface-variant">Account</p>
            <h2 className="font-serif text-[20px] text-primary mt-1">Read-only</h2>
            <p className="mt-2 text-[13px] text-on-surface-variant">
              These details identify your account and can&rsquo;t be changed here.
            </p>
          </div>
          <Card variant="dashboard" className="md:col-span-2 p-6 space-y-4">
            <div>
              <p className="label-sm uppercase text-on-surface-variant">Email</p>
              <p className="mt-1 text-on-surface">{user?.email}</p>
            </div>
            <div>
              <p className="label-sm uppercase text-on-surface-variant">Role</p>
              <p className="mt-1 text-on-surface capitalize">{user?.role}</p>
            </div>
          </Card>
        </section>

        <form onSubmit={handleSubmit} className="grid md:grid-cols-3 gap-6">
          <div>
            <p className="label-sm uppercase text-on-surface-variant">Public profile</p>
            <h2 className="font-serif text-[20px] text-primary mt-1">How readers see you</h2>
            <p className="mt-2 text-[13px] text-on-surface-variant">
              Shown on your books, comments, and the author page.
            </p>
          </div>
          <Card variant="dashboard" className="md:col-span-2 p-6 space-y-6">
            <div className="flex items-center gap-4">
              <Avatar
                name={form.displayName || user?.displayName}
                src={form.avatarUrl || undefined}
                size={56}
              />
              <div className="flex-1 min-w-0">
                <p className="label-sm uppercase text-on-surface-variant">Preview</p>
                <p className="font-serif text-[16px] text-on-surface truncate">
                  {form.displayName || 'Your name'}
                </p>
              </div>
            </div>

            <TextInput
              label="Display name"
              variant="dashboard"
              value={form.displayName}
              onChange={(e) => update('displayName', e.target.value)}
              error={errors.displayName}
              required
            />

            <TextInput
              label="Avatar URL"
              variant="dashboard"
              value={form.avatarUrl}
              onChange={(e) => update('avatarUrl', e.target.value)}
              error={errors.avatarUrl}
              hint="Paste an https link to your photo, or leave blank for initials."
              autoComplete="off"
            />

            <TextInput
              label="Bio"
              variant="dashboard"
              value={form.bio}
              onChange={(e) => update('bio', e.target.value)}
              error={errors.bio}
              hint={`${form.bio.length}/2000`}
              multiline
              rows={5}
            />

            <div className="flex items-center gap-3 justify-end pt-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleReset}
                disabled={saving}
              >
                Reset
              </Button>
              <Button
                type="submit"
                variant="primary"
                size="sm"
                disabled={saving}
              >
                {saving ? 'Saving…' : 'Save changes'}
              </Button>
            </div>
          </Card>
        </form>
      </div>
    </DashboardShell>
  );
}

export default function AuthorSettingsPage() {
  return (
    <AuthGuard roles={['author', 'admin']}>
      <AuthorSettings />
    </AuthGuard>
  );
}
