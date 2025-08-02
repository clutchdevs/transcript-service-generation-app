# Componente Button

Un componente de botón reutilizable y elegante para Angular con soporte para múltiples variantes, estados y personalización.

## Características

- ✅ **Variantes múltiples**: Primary, Secondary, Outline, Ghost
- ✅ **Tamaños configurables**: Small, Medium, Large
- ✅ **Estados**: Normal, Loading, Disabled
- ✅ **Iconos**: Soporte para iconos SVG con posicionamiento
- ✅ **Ancho completo**: Opción para botones de ancho completo
- ✅ **Accesibilidad**: Focus states y ARIA attributes
- ✅ **Animaciones**: Transiciones suaves y efectos hover
- ✅ **TypeScript**: Tipado completo con interfaces

## Uso básico

```html
<app-button>Botón básico</app-button>
```

## Props

| Prop | Tipo | Default | Descripción |
|------|------|---------|-------------|
| `variant` | `'primary' \| 'secondary' \| 'outline' \| 'ghost'` | `'primary'` | Estilo visual del botón |
| `size` | `'sm' \| 'md' \| 'lg'` | `'md'` | Tamaño del botón |
| `disabled` | `boolean` | `false` | Estado deshabilitado |
| `loading` | `boolean` | `false` | Estado de carga con spinner |
| `fullWidth` | `boolean` | `false` | Ancho completo del contenedor |
| `type` | `'button' \| 'submit' \| 'reset'` | `'button'` | Tipo de botón HTML |
| `icon` | `string` | `undefined` | Path SVG del icono |
| `iconPosition` | `'left' \| 'right'` | `'left'` | Posición del icono |

## Eventos

| Evento | Descripción |
|--------|-------------|
| `clicked` | Emitido cuando se hace click en el botón |

## Ejemplos

### Variantes

```html
<app-button variant="primary">Primary</app-button>
<app-button variant="secondary">Secondary</app-button>
<app-button variant="outline">Outline</app-button>
<app-button variant="ghost">Ghost</app-button>
```

### Tamaños

```html
<app-button size="sm">Small</app-button>
<app-button size="md">Medium</app-button>
<app-button size="lg">Large</app-button>
```

### Con iconos

```html
<app-button icon="M12 4v16m8-8H4">
  Con icono izquierdo
</app-button>

<app-button 
  icon="M9 5l7 7-7 7" 
  iconPosition="right"
>
  Con icono derecho
</app-button>
```

### Estados

```html
<app-button>Normal</app-button>
<app-button [loading]="true">Loading</app-button>
<app-button [disabled]="true">Disabled</app-button>
```

### Ancho completo

```html
<app-button [fullWidth]="true">
  Botón de ancho completo
</app-button>
```

### En formularios

```html
<app-button 
  type="submit" 
  variant="primary" 
  [loading]="isSubmitting"
  [fullWidth]="true"
>
  {{ isSubmitting ? 'Enviando...' : 'Enviar' }}
</app-button>
```

## Iconos SVG

Para usar iconos, proporciona el atributo `d` del path SVG:

```html
<!-- Icono de usuario -->
<app-button icon="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z">
  Usuario
</app-button>

<!-- Icono de flecha -->
<app-button icon="M9 5l7 7-7 7" iconPosition="right">
  Siguiente
</app-button>
```

## Estilos

El componente utiliza Tailwind CSS para los estilos. Las clases se generan dinámicamente basándose en las props proporcionadas.

### Personalización

Para personalizar los estilos, puedes:

1. Modificar las clases en el método `buttonClasses()` del componente
2. Extender los estilos en `button.scss`
3. Usar CSS custom properties para temas

## Accesibilidad

- Soporte completo para navegación por teclado
- Estados de focus visibles
- ARIA attributes apropiados
- Compatible con lectores de pantalla

## Dependencias

- Angular 17+
- Tailwind CSS
- CommonModule de Angular 
