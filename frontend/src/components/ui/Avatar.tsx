import { cn, userColor } from '../../utils/helpers';

interface AvatarProps {
  name: string;
  color?: string;
  size?: 'sm' | 'md' | 'lg';
}

export function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
}

export function Avatar({ name, color, size }: AvatarProps) {
  const style = {
    backgroundColor: color ?? userColor(name),
  };
  return (
    <span
      className={cn('avatar', size === 'sm' && 'avatar-sm', size === 'lg' && 'avatar-lg')}
      style={style}
    >
      {initials(name)}
    </span>
  );
}
