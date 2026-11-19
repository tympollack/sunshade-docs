import type { Metadata } from 'next';
import { Suspense } from 'react';
import { BinderVerifier } from '@/components/binder-verifier';

export const metadata: Metadata = {
  title: 'Verify Living Binder Sheet',
  description: 'Check whether a printed Living Binder sheet matches the current live SunShade documentation.',
};

export default function BinderVerifyPage() {
  return (
    <Suspense
      fallback={
        <div className="max-w-4xl mx-auto px-4 py-12 text-sm text-neutral-500">
          Loading Living Binder verifier...
        </div>
      }
    >
      <BinderVerifier />
    </Suspense>
  );
}
