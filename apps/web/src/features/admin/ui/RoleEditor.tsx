'use client';

import { useState } from 'react';
import { deleteRole, saveRole } from '../api/actions';
import { ActionMessage } from './ActionMessage';
import { useAction } from './useAction';

export interface PermissionOption {
  id: string;
  slug: string;
  name: string;
  section: string;
}

export interface RoleRow {
  id: string;
  name: string;
  description?: string;
  permissionIds: string[];
  members: number;
}

const BUILT_IN = ['admin', 'customer'];

/** One role: name, description and a checkbox per permission, grouped by section. */
export function RoleEditor({ role, permissions, onDone }: { role?: RoleRow; permissions: PermissionOption[]; onDone?: () => void }) {
  const { pending, result, run } = useAction();
  const [name, setName] = useState(role?.name ?? '');
  const [description, setDescription] = useState(role?.description ?? '');
  const [chosen, setChosen] = useState(() => new Set(role?.permissionIds ?? []));
  const locked = role?.name === 'admin';
  const builtIn = role ? BUILT_IN.includes(role.name) : false;
  const sections = Object.entries(
    permissions.reduce<Record<string, PermissionOption[]>>((acc, p) => {
      (acc[p.section] ??= []).push(p);
      return acc;
    }, {}),
  ).sort(([a], [b]) => a.localeCompare(b));

  const toggle = (id: string) =>
    setChosen((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  return (
    <form
      className="panel space-y-5 p-5 text-[14px]"
      onSubmit={(e) => {
        e.preventDefault();
        run(
          () => saveRole(role?.id, { name, description: description.trim() || undefined, ...(locked ? {} : { permissions: [...chosen] }) } as Parameters<typeof saveRole>[1]),
          (r) => r.status === 'ok' && !role && onDone?.(),
        );
      }}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block">
          Name
          <input value={name} onChange={(e) => setName(e.target.value)} disabled={builtIn} required minLength={2} maxLength={50} className="mt-1 field disabled:bg-soft" />
        </label>
        <label className="block">
          Description
          <input value={description} onChange={(e) => setDescription(e.target.value)} maxLength={500} className="mt-1 field" />
        </label>
      </div>
      {locked ? (
        <p className="text-mute">The admin role always has every permission.</p>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {sections.map(([section, list]) => (
            <fieldset key={section}>
              <legend className="mb-2 text-[11px] uppercase tracking-[0.16em] text-mute">{section}</legend>
              {list.map((p) => (
                <label key={p.id} className="flex items-center gap-2 py-0.5">
                  <input type="checkbox" checked={chosen.has(p.id)} onChange={() => toggle(p.id)} className="h-4 w-4 accent-ink" />
                  <span>{p.name}</span>
                </label>
              ))}
            </fieldset>
          ))}
        </div>
      )}
      <div className="flex flex-wrap items-center gap-4">
        <button type="submit" disabled={pending} className="btn h-10 px-5">{pending ? 'Saving…' : role ? 'Save role' : 'Create role'}</button>
        {role && !builtIn && (
          <button
            type="button"
            disabled={pending || role.members > 0}
            title={role.members > 0 ? 'Move its members to another role first' : undefined}
            className="text-danger underline underline-offset-4 disabled:opacity-50"
            onClick={() => window.confirm(`Delete the ${role.name} role?`) && run(() => deleteRole(role.id))}
          >
            Delete role
          </button>
        )}
        <ActionMessage result={result} />
      </div>
    </form>
  );
}

/** The roles list with one editor open at a time. */
export function RolesManager({ roles, permissions }: { roles: RoleRow[]; permissions: PermissionOption[] }) {
  const [open, setOpen] = useState<string | null>(null);
  return (
    <div className="space-y-3">
      {roles.map((r) => (
        <section key={r.id} className="border-b border-line pb-3" data-testid="admin-role">
          <button type="button" aria-expanded={open === r.id} onClick={() => setOpen(open === r.id ? null : r.id)} className="flex w-full items-baseline justify-between gap-4 py-2 text-left">
            <span>
              <span className="text-[16px] font-medium capitalize text-ink">{r.name}</span>
              {r.description && <span className="ml-3 text-[13px] text-mute">{r.description}</span>}
            </span>
            <span className="whitespace-nowrap text-[13px] text-mute">
              {r.name === 'admin' ? 'All' : r.permissionIds.length} permissions · {r.members} {r.members === 1 ? 'person' : 'people'}
            </span>
          </button>
          {open === r.id && <RoleEditor key={r.id} role={r} permissions={permissions} />}
        </section>
      ))}
      <section className="pt-4">
        {open === 'new' ? (
          <RoleEditor permissions={permissions} onDone={() => setOpen(null)} />
        ) : (
          <button type="button" className="btn btn-outline h-10 px-5" onClick={() => setOpen('new')}>New role</button>
        )}
      </section>
    </div>
  );
}
