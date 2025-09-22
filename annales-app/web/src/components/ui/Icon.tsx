import React from 'react';

type IconSize = 'sm' | 'md' | 'lg';

interface IconProps {
  size?: IconSize;
  className?: string;
  children: React.ReactNode;
}

const sizeMap: Record<IconSize, { width: string; height: string }> = {
  sm: { width: '12px', height: '12px' },
  md: { width: '16px', height: '16px' },
  lg: { width: '20px', height: '20px' }
};

const tailwindSizeMap: Record<IconSize, string> = {
  sm: 'w-3 h-3',
  md: 'w-4 h-4',
  lg: 'w-5 h-5'
};

export function Icon({ size = 'sm', className = '', children }: IconProps) {
  const sizeStyle = sizeMap[size];
  const baseClasses = `shrink-0 ${tailwindSizeMap[size]}`;

  return (
    <svg
      className={`${baseClasses} ${className}`}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      style={sizeStyle}
    >
      {children}
    </svg>
  );
}

export function SearchIcon({ size = 'md', className = 'text-gray-400' }: Omit<IconProps, 'children'>) {
  return (
    <Icon size={size} className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
    </Icon>
  );
}

export function ModuleIcon({ size = 'sm', className = 'text-gray-400' }: Omit<IconProps, 'children'>) {
  return (
    <Icon size={size} className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
    </Icon>
  );
}

export function DocumentIcon({ size = 'sm', className = 'text-gray-400' }: Omit<IconProps, 'children'>) {
  return (
    <Icon size={size} className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </Icon>
  );
}

export function EyeIcon({ size = 'sm', className = 'text-blue-600' }: Omit<IconProps, 'children'>) {
  return (
    <Icon size={size} className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
    </Icon>
  );
}

export function ErrorIcon({ size = 'md', className = 'text-red-400' }: Omit<IconProps, 'children'>) {
  return (
    <Icon size={size} className={className}>
      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
    </Icon>
  );
}

export function EmptyStateIcon({ size = 'lg', className = 'text-gray-400' }: Omit<IconProps, 'children'>) {
  return (
    <Icon size={size} className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </Icon>
  );
}

export function BackIcon({ size = 'md', className = 'text-blue-600' }: Omit<IconProps, 'children'>) {
  return (
    <Icon size={size} className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
    </Icon>
  );
}