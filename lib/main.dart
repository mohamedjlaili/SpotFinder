import 'package:flutter/material.dart';
import 'screens/splash_screen.dart';

void main() {
  runApp(const SpotFinderApp());
}

class SpotFinderApp extends StatelessWidget {
  const SpotFinderApp({Key? key}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'SpotFinder',
      theme: ThemeData(
        fontFamily: 'Poppins',
        scaffoldBackgroundColor: const Color(0xFF1a1d3d),
        colorScheme: ColorScheme.fromSwatch().copyWith(
          secondary: const Color(0xFF3F51B5),
        ),
      ),
      home: const SplashScreen(),
      debugShowCheckedModeBanner: false,
    );
  }
}
