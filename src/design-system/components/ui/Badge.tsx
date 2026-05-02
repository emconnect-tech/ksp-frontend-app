import React from 'react';

type BadgeProps = React.HTMLAttributes<HTMLSpanElement> & {
  status: 'ongoing' | 'completed' | 'upcoming';
  children: React.ReactNode;
};

export const Badge: React.FC<BadgeProps> = ({ status, children, className = '', ...props }) => {
  return (
    <span className={`badge badge-${status} ${className}`} {...props}>
      {children}
    </span>
  );
};
