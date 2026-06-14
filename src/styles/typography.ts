import { StyleSheet } from 'react-native';

// Font family mappings
export const fontFamilies = {
    // Inter fonts
    regular: 'Inter_400Regular',
    medium: 'Inter_500Medium',
    semiBold: 'Inter_600SemiBold',
    bold: 'Inter_700Bold',
    extraBold: 'Inter_800ExtraBold',
};

// Typography styles
export const typography = {
    // Headlines
    headlineLarge: {
        fontFamily: fontFamilies.bold,
        fontSize: 32,
        lineHeight: 40,
        letterSpacing: -0.5,
    },
    headlineMedium: {
        fontFamily: fontFamilies.semiBold,
        fontSize: 24,
        lineHeight: 32,
        letterSpacing: -0.25,
    },
    headlineSmall: {
        fontFamily: fontFamilies.semiBold,
        fontSize: 20,
        lineHeight: 28,
        letterSpacing: 0,
    },
    
    // Body text
    bodyLarge: {
        fontFamily: fontFamilies.regular,
        fontSize: 16,
        lineHeight: 24,
        letterSpacing: 0.15,
    },
    bodyMedium: {
        fontFamily: fontFamilies.regular,
        fontSize: 14,
        lineHeight: 20,
        letterSpacing: 0.25,
    },
    bodySmall: {
        fontFamily: fontFamilies.regular,
        fontSize: 12,
        lineHeight: 16,
        letterSpacing: 0.4,
    },
    
    // Labels
    labelLarge: {
        fontFamily: fontFamilies.medium,
        fontSize: 14,
        lineHeight: 20,
        letterSpacing: 0.1,
    },
    labelMedium: {
        fontFamily: fontFamilies.medium,
        fontSize: 12,
        lineHeight: 16,
        letterSpacing: 0.5,
    },
    labelSmall: {
        fontFamily: fontFamilies.medium,
        fontSize: 11,
        lineHeight: 16,
        letterSpacing: 0.5,
    },
    
    // Buttons
    buttonLarge: {
        fontFamily: fontFamilies.semiBold,
        fontSize: 16,
        lineHeight: 24,
        letterSpacing: 0.1,
    },
    buttonMedium: {
        fontFamily: fontFamilies.semiBold,
        fontSize: 14,
        lineHeight: 20,
        letterSpacing: 0.1,
    },
    buttonSmall: {
        fontFamily: fontFamilies.semiBold,
        fontSize: 12,
        lineHeight: 16,
        letterSpacing: 0.1,
    },
    
    // Title
    titleLarge: {
        fontFamily: fontFamilies.semiBold,
        fontSize: 22,
        lineHeight: 28,
        letterSpacing: 0,
    },
    titleMedium: {
        fontFamily: fontFamilies.medium,
        fontSize: 16,
        lineHeight: 24,
        letterSpacing: 0.15,
    },
    titleSmall: {
        fontFamily: fontFamilies.medium,
        fontSize: 14,
        lineHeight: 20,
        letterSpacing: 0.1,
    },
};

// Create a StyleSheet for easy use
export const typographyStyles = StyleSheet.create({
    // Headlines
    headlineLarge: typography.headlineLarge,
    headlineMedium: typography.headlineMedium,
    headlineSmall: typography.headlineSmall,
    
    // Body
    bodyLarge: typography.bodyLarge,
    bodyMedium: typography.bodyMedium,
    bodySmall: typography.bodySmall,
    
    // Labels
    labelLarge: typography.labelLarge,
    labelMedium: typography.labelMedium,
    labelSmall: typography.labelSmall,
    
    // Buttons
    buttonLarge: typography.buttonLarge,
    buttonMedium: typography.buttonMedium,
    buttonSmall: typography.buttonSmall,
    
    // Titles
    titleLarge: typography.titleLarge,
    titleMedium: typography.titleMedium,
    titleSmall: typography.titleSmall,
    
    // Utility
    textCenter: {
        textAlign: 'center',
    },
    textLeft: {
        textAlign: 'left',
    },
    textRight: {
        textAlign: 'right',
    },
});