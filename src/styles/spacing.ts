export const spacing = {
    // Base spacing
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
    xxl: 48,
    xxxl: 64,
    
    // Layout specific
    gutter: 16,
    cardPadding: 16,
    marginDesktop: 32,
    marginMobile: 16,
    
    // Component specific
    buttonHeight: 48,
    inputHeight: 56,
    iconSize: 24,
    iconSizeSmall: 20,
    iconSizeLarge: 32,
    borderRadiusSm: 8,
    borderRadiusMd: 12,
    borderRadiusLg: 16,
    borderRadiusXl: 24,
    borderRadiusFull: 9999,
};

export type Spacing = keyof typeof spacing;