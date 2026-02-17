import 'package:flutter/material.dart';

class HomeScreen extends StatelessWidget {
  const HomeScreen({Key? key}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      extendBodyBehindAppBar:
          true, // Optional: if you want gradient behind AppBar too
      appBar: AppBar(
        title: const Text("Home"),
        backgroundColor:
            Colors.transparent, // Make inner AppBar transparent if desired
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
