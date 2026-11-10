'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useRef, useState } from 'react';
import {
  useFieldArray,
  useForm,
  useWatch,
  type Control,
  type FieldErrors,
  type FieldPath,
  type UseFormRegister,
} from 'react-hook-form';
import type { Category, Warehouse } from '@/entities/category';
import type { Product } from '@/entities/product';
import { Icon } from '@/shared/ui';
import { deleteProduct, saveProduct } from '../api/actions';
import { uploadProductImage } from '../api/upload';
import { deriveSlug, isAllowedImage, productFormSchema, productToFormValues, type ProductFormValues } from '../model/product-form';
import { ActionMessage } from './ActionMessage';
import { describe, Field, inputClass } from './Field';
import { useAction } from './useAction';

type Errors = FieldErrors<ProductFormValues>;
type Props = { product?: Product; categories: Category[]; warehouses: Warehouse[] };

/** Create or edit a product: details, specifications, prices, photos and stock per option and warehouse. */
export function ProductForm({ product, categories, warehouses }: Props) {
  const router = useRouter();
  const save = useAction();
  const remove = useAction();
  const codes = warehouses.map((w) => w.code);
  // built once: useForm reads defaultValues only on the first render
  const [defaults] = useState(() => productToFormValues(product, codes, categories[0]?.slug));
  const {
    register,
    control,
    handleSubmit,
    setError,
    reset,
    formState: { errors, isDirty },
  } = useForm<ProductFormValues>({
    resolver: zodResolver(productFormSchema),
    defaultValues: defaults,
    mode: 'onTouched',
  });

  const onSubmit = handleSubmit((values) =>
    save.run(
      () => saveProduct(product?.id, values),
      (r) => {
        if (r.status === 'error') {
          for (const [path, message] of Object.entries(r.fieldErrors ?? {})) {
            setError(path as FieldPath<ProductFormValues>, { message });
          }
        } else {
          // the saved product becomes the new baseline for "unsaved changes"
          reset(r.product ? productToFormValues(r.product, codes) : values);
        }
      },
    ),
  );

  const onDelete = () => {
    if (!product || !window.confirm(`Move “${product.title}” to the trash? You can restore it later.`)) return;
    remove.run(
      () => deleteProduct(product.id),
      (r) => r.status === 'ok' && router.push('/admin/products'),
    );
  };

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-10 pb-24 text-[14px]">
      <Section title="Basics">
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField register={register} errors={errors} name="title" label="Name" placeholder="20V MAX XR Brushless Hammer Drill" className="sm:col-span-2" />
          <TextField register={register} errors={errors} name="brand" label="Brand" />
          <TextField register={register} errors={errors} name="model" label="Model (optional)" placeholder="DCD805" hint="Used for the URL and SKUs when they are left empty." />
          <Field label="Category" htmlFor="category" error={errors.category?.message}>
            <select {...register('category')} {...describe('category', errors.category?.message)} className={inputClass}>
              {categories.map((c) => <option key={c.slug} value={c.slug}>{c.name}</option>)}
            </select>
          </Field>
          <TextField register={register} errors={errors} name="slug" label="URL name" hint="Leave empty to build it from the model and name." />
        </div>
        <SlugPreview control={control} />
      </Section>

      <Section title="Description">
        <Field label="Description" htmlFor="description" error={errors.description?.message}>
          <textarea rows={4} {...register('description')} {...describe('description', errors.description?.message)} className={inputClass} />
        </Field>
        <Field label="Features (one per line)" htmlFor="features" error={errors.features?.message} className="mt-4">
          <textarea rows={5} {...register('features')} {...describe('features', errors.features?.message)} className={inputClass} placeholder={'Brushless motor\nLED work light'} />
        </Field>
        <TextField register={register} errors={errors} name="tags" label="Tags (comma separated)" className="mt-4" />
      </Section>

      <Section title="Specifications">
        <SpecFields control={control} register={register} errors={errors} categories={categories} />
      </Section>

      <Section title="Price">
        <div className="grid gap-4 sm:grid-cols-3">
          <TextField register={register} errors={errors} name="price" label="Price (USD)" inputMode="decimal" placeholder="199.00" />
          <TextField register={register} errors={errors} name="compareAtPrice" label="Compare-at price (optional)" inputMode="decimal" hint="Shows the price as a sale. Empty ends the sale." />
          <label className="flex items-center gap-2 self-center pt-5 text-ink">
            <input type="checkbox" {...register('featured')} className="h-4 w-4 accent-ink" /> Featured on the home page
          </label>
        </div>
      </Section>

      <Section title="Photos">
        <ImageManager control={control} register={register} errors={errors} />
      </Section>

      <Section title="Options and stock">
        <VariantEditor control={control} register={register} errors={errors} warehouses={warehouses} />
      </Section>

      <div className="fixed inset-x-0 bottom-0 z-30 border-t-2 border-ink bg-paper">
        <div className="container-page flex flex-wrap items-center gap-4 py-3">
          <button type="submit" disabled={save.pending} className="btn">
            {save.pending ? 'Saving…' : product ? 'Save changes' : 'Create product'}
          </button>
          {product && (
            <button type="button" onClick={onDelete} disabled={remove.pending} className="text-[13px] text-danger underline underline-offset-4">
              Move to trash
            </button>
          )}
          {isDirty && !save.pending && <span className="text-[13px] text-mute">Unsaved changes</span>}
          {Object.keys(errors).length > 0 && !save.result && (
            <p role="alert" className="text-[13px] text-danger">Please fix the highlighted fields.</p>
          )}
          <ActionMessage result={save.result ?? remove.result} />
        </div>
      </div>
    </form>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <fieldset>
      <legend className="heading mb-4 text-[20px]">{title}</legend>
      {children}
    </fieldset>
  );
}

type TextName = 'title' | 'brand' | 'model' | 'slug' | 'description' | 'features' | 'tags' | 'price' | 'compareAtPrice';

function TextField({
  register,
  errors,
  name,
  label,
  hint,
  className,
  ...input
}: {
  register: UseFormRegister<ProductFormValues>;
  errors: Errors;
  name: TextName;
  label: string;
  hint?: string;
  className?: string;
} & Omit<React.InputHTMLAttributes<HTMLInputElement>, 'name'>) {
  const error = errors[name]?.message;
  return (
    <Field label={label} htmlFor={name} error={error} hint={hint} className={className}>
      <input {...input} {...register(name)} {...describe(name, error, hint)} className={inputClass} />
    </Field>
  );
}

/** Watches only the fields the URL depends on, so typing elsewhere does not re-render it. */
function SlugPreview({ control }: { control: Control<ProductFormValues> }) {
  const [slug, title, model] = useWatch({ control, name: ['slug', 'title', 'model'] });
  const url = deriveSlug({ slug, title, model });
  return url ? <p className="mt-3 font-mono text-[12px] text-mute">Shop address: /products/{url}</p> : null;
}

/** One field per specification of the chosen category; re-renders only when the category changes. */
function SpecFields({
  control,
  register,
  errors,
  categories,
}: {
  control: Control<ProductFormValues>;
  register: UseFormRegister<ProductFormValues>;
  errors: Errors;
  categories: Category[];
}) {
  const slug = useWatch({ control, name: 'category' });
  const specs = [...(categories.find((c) => c.slug === slug)?.specs ?? [])].sort((a, b) => a.sortOrder - b.sortOrder);
  if (specs.length === 0) return <p className="text-mute">This category has no specifications.</p>;
  return (
    <>
      <p className="mb-3 text-mute">Leave a field empty when it does not apply. Numbers are in the unit shown.</p>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {specs.map((s) => {
          const id = `spec-${s.key}`;
          const error = errors.specs?.[s.key]?.message;
          return (
            <Field key={s.key} label={s.unit ? `${s.label} (${s.unit})` : s.label} htmlFor={id} error={error}>
              <input {...register(`specs.${s.key}`)} {...describe(id, error)} inputMode={s.kind === 'number' ? 'decimal' : undefined} className={inputClass} />
            </Field>
          );
        })}
      </div>
    </>
  );
}

function ImageManager({
  control,
  register,
  errors,
}: {
  control: Control<ProductFormValues>;
  register: UseFormRegister<ProductFormValues>;
  errors: Errors;
}) {
  const { fields, append, remove, move } = useFieldArray({ control, name: 'images' });
  const images = useWatch({ control, name: 'images' });
  const [uploading, setUploading] = useState(0);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  const onFiles = async (files: FileList | null) => {
    if (!files?.length) return;
    setUploadError(null);
    setUploading(files.length);
    // one at a time keeps the order the admin picked them in
    for (const file of Array.from(files)) {
      try {
        append({ url: await uploadProductImage(file) });
      } catch (err) {
        setUploadError(`${file.name}: ${err instanceof Error ? err.message : 'upload failed'}`);
      }
      setUploading((n) => n - 1);
    }
    if (fileInput.current) fileInput.current.value = '';
  };

  return (
    <div>
      <p className="mb-3 text-mute">The first photo is the cover in the shop. Use the arrows to change the order.</p>
      {fields.length > 0 && (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
          {fields.map((field, i) => {
            const src = images?.[i]?.url ?? '';
            const error = errors.images?.[i]?.url?.message;
            return (
              <li key={field.id} className="panel p-2">
                <input type="hidden" {...register(`images.${i}.url`)} />
                <div className="relative aspect-square bg-paper">
                  {isAllowedImage(src) ? (
                    <Image src={src} alt={`Photo ${i + 1}`} fill sizes="160px" className="object-contain" />
                  ) : (
                    <span className="grid h-full place-items-center break-all p-2 text-center text-[11px] text-mute">{src}</span>
                  )}
                  {i === 0 && <span className="tag tag-accent absolute left-1 top-1">Cover</span>}
                </div>
                {error && <p className="mt-1 text-[12px] text-danger">{error}</p>}
                <div className="mt-2 flex items-center justify-between text-[12px]">
                  <span className="flex gap-1">
                    <IconButton label={`Move photo ${i + 1} earlier`} disabled={i === 0} onClick={() => move(i, i - 1)} rotate={90} />
                    <IconButton label={`Move photo ${i + 1} later`} disabled={i === fields.length - 1} onClick={() => move(i, i + 1)} rotate={-90} />
                  </span>
                  <button type="button" onClick={() => remove(i)} className="text-danger underline underline-offset-2">Remove</button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
      {errors.images?.message && <p className="mt-2 text-[12px] text-danger">{errors.images.message}</p>}
      <label className="btn btn-outline mt-4 cursor-pointer focus-within:outline focus-within:outline-[3px] focus-within:outline-accent">
        <Icon name="plus" width={16} height={16} />
        {uploading ? `Uploading ${uploading}…` : 'Upload photos'}
        <input ref={fileInput} type="file" accept="image/jpeg,image/png,image/webp,image/gif" multiple className="sr-only" onChange={(e) => onFiles(e.target.files)} />
      </label>
      {uploadError && <p role="alert" className="mt-2 text-[12px] text-danger">{uploadError}</p>}
    </div>
  );
}

function IconButton({ label, onClick, disabled, rotate }: { label: string; onClick: () => void; disabled?: boolean; rotate: number }) {
  return (
    <button type="button" aria-label={label} title={label} onClick={onClick} disabled={disabled} className="grid h-7 w-7 place-items-center border border-line disabled:opacity-30">
      <Icon name="chevron" width={14} height={14} style={{ transform: `rotate(${rotate}deg)` }} />
    </button>
  );
}

function VariantEditor({
  control,
  register,
  errors,
  warehouses,
}: {
  control: Control<ProductFormValues>;
  register: UseFormRegister<ProductFormValues>;
  errors: Errors;
  warehouses: Warehouse[];
}) {
  const { fields, append, remove } = useFieldArray({ control, name: 'variants' });
  const head = 'pb-2 pr-2 font-medium';
  return (
    <div>
      <p className="mb-3 text-mute">An option is something the shopper picks, e.g. “Body only” or “2 × 5.0 Ah kit”. An empty price uses the product price.</p>
      <div className="relative -mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
        <table className="w-full min-w-[720px] text-left">
          <thead className="text-[11px] uppercase tracking-[0.16em] text-mute">
            <tr>
              <th className={head}>Option</th>
              <th className={head}>SKU (optional)</th>
              <th className={head}>Own price</th>
              {warehouses.map((w) => <th key={w.code} className={head}>{w.name}</th>)}
              <th><span className="sr-only">Remove</span></th>
            </tr>
          </thead>
          <tbody>
            {fields.map((field, i) => {
              const e = errors.variants?.[i];
              return (
                <tr key={field.id} className="align-top">
                  <td className="py-1 pr-2"><input aria-label={`Option, row ${i + 1}`} aria-invalid={e?.label ? true : undefined} {...register(`variants.${i}.label`)} className={inputClass} />{e?.label && <span className="text-[12px] text-danger">{e.label.message}</span>}</td>
                  <td className="py-1 pr-2"><input aria-label={`SKU, row ${i + 1}`} aria-invalid={e?.sku ? true : undefined} {...register(`variants.${i}.sku`)} placeholder="auto" className={`${inputClass} font-mono`} />{e?.sku && <span className="text-[12px] text-danger">{e.sku.message}</span>}</td>
                  <td className="w-28 py-1 pr-2"><input aria-label={`Own price, row ${i + 1}`} aria-invalid={e?.price ? true : undefined} {...register(`variants.${i}.price`)} inputMode="decimal" placeholder="—" className={inputClass} />{e?.price && <span className="text-[12px] text-danger">{e.price.message}</span>}</td>
                  {warehouses.map((w) => {
                    const err = e?.stock?.[w.code]?.message;
                    return (
                      <td key={w.code} className="w-24 py-1 pr-2">
                        <input type="number" min={0} aria-label={`Stock in ${w.name}, row ${i + 1}`} aria-invalid={err ? true : undefined} {...register(`variants.${i}.stock.${w.code}`, { valueAsNumber: true })} className={inputClass} />
                        {err && <span className="text-[12px] text-danger">{err}</span>}
                      </td>
                    );
                  })}
                  <td className="py-1 text-right">
                    <button type="button" onClick={() => remove(i)} disabled={fields.length === 1} aria-label={`Remove row ${i + 1}`} className="mt-2 grid h-8 w-8 place-items-center text-mute hover:text-danger disabled:opacity-30">
                      <Icon name="close" width={16} height={16} />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {(errors.variants?.message || errors.variants?.root?.message) && (
        <p role="alert" className="mt-2 text-[12px] text-danger">{errors.variants.message ?? errors.variants.root?.message}</p>
      )}
      <TotalStock control={control} />
      <button
        type="button"
        className="btn btn-outline mt-4"
        onClick={() => append({ label: '', sku: '', price: '', stock: Object.fromEntries(warehouses.map((w) => [w.code, 0])) })}
      >
        <Icon name="plus" width={16} height={16} /> Add option
      </button>
    </div>
  );
}

function TotalStock({ control }: { control: Control<ProductFormValues> }) {
  const variants = useWatch({ control, name: 'variants' });
  const total = variants.reduce((n, v) => n + Object.values(v.stock).reduce((m, q) => m + (Number.isFinite(q) ? q : 0), 0), 0);
  return <p className="mt-2 text-mute">Total stock: <span className="font-mono">{total}</span></p>;
}
