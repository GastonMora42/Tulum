// src/components/ui/HighContrastComponents.tsx
import React, { InputHTMLAttributes, LabelHTMLAttributes, TextareaHTMLAttributes, SelectHTMLAttributes } from 'react';

// Tipos para props
type TableProps = React.TableHTMLAttributes<HTMLTableElement>;
type ThProps = React.ThHTMLAttributes<HTMLTableCellElement>;
type TdProps = React.TdHTMLAttributes<HTMLTableCellElement>;
type InputProps = InputHTMLAttributes<HTMLInputElement>;
type TextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement>;
type SelectProps = SelectHTMLAttributes<HTMLSelectElement>;
type LabelProps = LabelHTMLAttributes<HTMLLabelElement>;
type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement>;

// Tabla de alto contraste
export function HCTable({ children, className = '', ...props }: TableProps) {
  return (
    <table 
      className={`hc-table ${className}`} 
      style={{ borderCollapse: 'collapse', width: '100%' }}
      {...props}
    >
      {children}
    </table>
  );
}

// Encabezado de tabla de alto contraste
export function HCTh({ children, className = '', ...props }: ThProps) {
  return (
    <th 
      className={`hc-th ${className}`} 
      style={{ 
        backgroundColor: '#e6e2df', 
        color: '#000000', 
        fontWeight: 600,
        padding: '0.75rem',
        textAlign: 'left',
        borderBottom: '1px solid rgba(0, 0, 0, 0.1)'
      }}
      {...props}
    >
      {children}
    </th>
  );
}

// Celda de tabla de alto contraste
export function HCTd({ children, className = '', ...props }: TdProps) {
  return (
    <td 
      className={`hc-td ${className}`} 
      style={{ 
        color: '#000000',
        padding: '0.75rem',
        borderBottom: '1px solid rgba(0, 0, 0, 0.1)'
      }}
      {...props}
    >
      {children}
    </td>
  );
}

// Input de alto contraste
export function HCInput({ className = '', ...props }: InputProps) {
  return (
    <input 
      className={`hc-input ${className}`}
      style={{ 
        borderColor: 'rgba(0, 0, 0, 0.3)',
        color: '#000000',
        backgroundColor: '#ffffff',
        padding: '0.5rem 0.75rem',
        borderRadius: '0.375rem',
        width: '100%',
        lineHeight: '1.25'
      }}
      {...props}
    />
  );
}

// Textarea de alto contraste
export function HCTextarea({ className = '', ...props }: TextareaProps) {
  return (
    <textarea 
      className={`hc-textarea ${className}`}
      style={{ 
        borderColor: 'rgba(0, 0, 0, 0.3)',
        color: '#000000',
        backgroundColor: '#ffffff',
        padding: '0.5rem 0.75rem',
        borderRadius: '0.375rem',
        width: '100%',
        lineHeight: '1.25'
      }}
      {...props}
    />
  );
}

// Select de alto contraste
export function HCSelect({ className = '', children, ...props }: SelectProps) {
  return (
    <select 
      className={`hc-select ${className}`}
      style={{ 
        borderColor: 'rgba(0, 0, 0, 0.3)',
        color: '#000000',
        backgroundColor: '#ffffff',
        padding: '0.5rem 0.75rem',
        borderRadius: '0.375rem',
        width: '100%',
        lineHeight: '1.25',
        appearance: 'none'
      }}
      {...props}
    >
      {children}
    </select>
  );
}

// Label de alto contraste
export function HCLabel({ children, className = '', ...props }: LabelProps) {
  return (
    <label 
      className={`hc-label ${className}`}
      style={{ 
        color: '#000000', 
        fontWeight: 500,
        display: 'block',
        marginBottom: '0.25rem'
      }}
      {...props}
    >
      {children}
    </label>
  );
}

// Botón de alto contraste
export function HCButton({ children, className = '', ...props }: ButtonProps) {
  const isDefault = !className.includes('bg-') && !className.includes('text-white');
  
  return (
    <button 
      className={`hc-button ${className}`}
      style={isDefault ? { 
        backgroundColor: '#ffffff',
        color: '#000000',
        border: '1px solid rgba(0, 0, 0, 0.3)',
        borderRadius: '0.375rem',
        padding: '0.5rem 1rem',
        fontWeight: 500,
        fontSize: '0.875rem',
        lineHeight: '1.25rem'
      } : undefined}
      {...props}
    >
      {children}
    </button>
  );
}