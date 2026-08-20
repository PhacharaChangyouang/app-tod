import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

class AppTheme {
  // Primary sky-blue gradient colors (from user's reference image)
  static const Color primaryBlue = Color(0xFF29ABE2);
  static const Color primaryBlueDark = Color(0xFF1A7DB5);
  static const Color primaryBlueMid = Color(0xFF4BC8E8);
  static const Color accentTeal = Color(0xFF00BCD4);
  static const Color backgroundWhite = Color(0xFFF5FAFF);
  static const Color cardWhite = Color(0xFFFFFFFF);
  static const Color textDark = Color(0xFF1A2A3A);
  static const Color textGrey = Color(0xFF7B8FA6);
  static const Color sosRed = Color(0xFFE53935);
  static const Color successGreen = Color(0xFF43A047);

  static const LinearGradient headerGradient = LinearGradient(
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
    colors: [Color(0xFF1A7DB5), Color(0xFF29ABE2), Color(0xFF4BC8E8)],
  );

  static const LinearGradient bgGradient = LinearGradient(
    begin: Alignment.topCenter,
    end: Alignment.bottomCenter,
    colors: [Color(0xFF29ABE2), Color(0xFF4BC8E8), Color(0xFFF5FAFF)],
    stops: [0.0, 0.4, 0.7],
  );

  static ThemeData get lightTheme => ThemeData(
        useMaterial3: true,
        textTheme: GoogleFonts.sarabunTextTheme(),
        colorScheme: ColorScheme.fromSeed(
          seedColor: primaryBlue,
          primary: primaryBlue,
          secondary: accentTeal,
          surface: backgroundWhite,
        ),
        scaffoldBackgroundColor: backgroundWhite,
        appBarTheme: const AppBarTheme(
          backgroundColor: Colors.transparent,
          elevation: 0,
          foregroundColor: Colors.white,
          centerTitle: true,
          titleTextStyle: TextStyle(
            color: Colors.white,
            fontSize: 22,
            fontWeight: FontWeight.bold,
            fontFamily: 'Sarabun',
          ),
        ),
        elevatedButtonTheme: ElevatedButtonThemeData(
          style: ElevatedButton.styleFrom(
            backgroundColor: primaryBlue,
            foregroundColor: Colors.white,
            minimumSize: const Size(double.infinity, 60),
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(16),
            ),
            elevation: 4,
            textStyle: const TextStyle(
              fontSize: 22,
              fontWeight: FontWeight.bold,
              fontFamily: 'Sarabun',
            ),
          ),
        ),
        inputDecorationTheme: InputDecorationTheme(
          filled: true,
          fillColor: Colors.white,
          border: OutlineInputBorder(
            borderRadius: BorderRadius.circular(14),
            borderSide: BorderSide(color: Colors.grey.shade300),
          ),
          enabledBorder: OutlineInputBorder(
            borderRadius: BorderRadius.circular(14),
            borderSide: BorderSide(color: Colors.grey.shade300),
          ),
          focusedBorder: OutlineInputBorder(
            borderRadius: BorderRadius.circular(14),
            borderSide: const BorderSide(color: primaryBlue, width: 2),
          ),
          contentPadding: const EdgeInsets.symmetric(horizontal: 20, vertical: 18),
          hintStyle: const TextStyle(color: textGrey, fontSize: 18),
        ),
        cardTheme: CardThemeData(
          color: cardWhite,
          elevation: 6,
          shadowColor: Colors.black12,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
        ),
      );
}
