import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

class HomeScreen extends StatelessWidget {
  const HomeScreen({Key? key}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      extendBodyBehindAppBar:
          true, // Optional: if you want gradient behind AppBar too
      appBar: AppBar(
        title: Text(
          "SpotFinder",
          style: GoogleFonts.poppins(
            color: Colors.white,
            fontWeight: FontWeight.w600,
          ),
        ),
        centerTitle: true,
        backgroundColor: Colors.transparent,
        elevation: 0,
      ),
      body: Container(
        decoration: const BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topCenter,
            end: Alignment.bottomCenter,
            stops: [0.0, 0.53, 1.0],
            colors: [Color(0xFF171728), Color(0xFF0A0075), Color(0xFF696969)],
          ),
        ),
        child: const Center(
          child: Text(
            "Welcome to SpotFinder!",
            style: TextStyle(color: Colors.white),
          ),
        ),
      ),
    );
  }
}
