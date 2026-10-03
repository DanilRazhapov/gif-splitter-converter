type Size = 'sm' | 'md' | 'lg';

interface ButtonProps {
    onClick: () => void
    disabled?: boolean
    children: React.ReactNode
    size?: Size
}

const sizes: Record<Size, string> = {
    sm: 'px-2 py-1 text-sm',
    md: 'px-4 py-2 text-base',
    lg: 'px-6 py-3 text-lg',
}


export function Button({onClick, disabled, children, size = 'md'}: ButtonProps) {
    return (
        <button
            onClick={onClick}
            disabled={disabled}
            className={`${sizes[size]} bg-steam-hover hover:bg-steam-accent hover:text-steam-bg hover:cursor-pointer transition-colors rounded disabled:opacity-50 disabled:cursor-not-allowed w-full sm:flex-1`}
        >
            {children}
        </button>
    )
}