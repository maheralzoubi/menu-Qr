/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export const Skeleton = ({ className }: { className?: string, key?: any }) => (
  <div className={`animate-pulse bg-surface-container-highest rounded-lg ${className}`} />
);
