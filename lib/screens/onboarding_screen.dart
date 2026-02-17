import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'home_screen.dart';

class OnboardingScreen extends StatefulWidget {
  const OnboardingScreen({Key? key}) : super(key: key);

  @override
  _OnboardingScreenState createState() => _OnboardingScreenState();
}

class _OnboardingScreenState extends State<OnboardingScreen> {
  final PageController _pageController = PageController();
  int _currentPage = 0;

  final List<Map<String, String>> _onboardingData = [
    {
      'image': 'assets/images/onboarding_1.png',
      'title': 'Welcome to\nSpotFinder',
      'description': 'Find the best Study\nSpot near you',
      'highlight': 'Study',
    },
    {
      'image': 'assets/images/onboarding_2.png',
      'title': 'Discover & Book\nSpaces',
      'description': 'Easily find and\nreserve a quiet place\nto study or work',
      'highlight': 'reserve',
    },
    {
      'image': 'assets/images/onboarding_3.png',
      'title': 'Connect &\nCollaborate',
      'description': 'Join a community\nof students and\nprofessionals',
      'highlight': 'community',
    },
  ];

  void _onSkip() {
    Navigator.of(context).pushReplacement(
      MaterialPageRoute(builder: (context) => const HomeScreen()),
    );
  }

  void _onNext() {
    if (_currentPage < _onboardingData.length - 1) {
      _pageController.nextPage(
        duration: const Duration(milliseconds: 300),
        curve: Curves.easeIn,
      );
    } else {
      Navigator.of(context).pushReplacement(
        MaterialPageRoute(builder: (context) => const HomeScreen()),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Container(
        decoration: const BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topCenter,
            end: Alignment.bottomCenter,
            stops: [0.0, 0.53, 1.0],
            colors: [Color(0xFF171728), Color(0xFF0A0075), Color(0xFF696969)],
          ),
        ),
        child: SafeArea(
          child: Column(
            children: [
              Expanded(
                child: PageView.builder(
                  controller: _pageController,
                  onPageChanged: (index) {
                    setState(() {
                      _currentPage = index;
                    });
                  },
                  itemCount: _onboardingData.length,
                  itemBuilder: (context, index) => OnboardingContent(
                    image: _onboardingData[index]['image']!,
                    title: _onboardingData[index]['title']!,
                    description: _onboardingData[index]['description']!,
                    highlight: _onboardingData[index]['highlight']!,
                  ),
                ),
              ),
              Padding(
                padding: const EdgeInsets.symmetric(
                  horizontal: 20,
                  vertical: 20,
                ),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    // Skip Button
                    if (_currentPage != _onboardingData.length - 1)
                      TextButton(
                        onPressed: _onSkip,
                        child: Text(
                          'Skip',
                          style: GoogleFonts.poppins(
                            color: Colors.white70,
                            fontSize: 16,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                      )
                    else
                      const SizedBox(width: 48), // Placeholder for spacing
                    // Dots Indicator
                    Row(
                      children: List.generate(
                        _onboardingData.length,
                        (index) => Container(
                          margin: const EdgeInsets.symmetric(horizontal: 4),
                          width: _currentPage == index ? 20 : 8,
                          height: 8,
                          decoration: BoxDecoration(
                            color: _currentPage == index
                                ? const Color(0xFF3F51B5) // Active dot color
                                : Colors.white24,
                            borderRadius: BorderRadius.circular(4),
                          ),
                        ),
                      ),
                    ),

                    // Next/Done Button
                    ElevatedButton(
                      onPressed: _onNext,
                      style: ElevatedButton.styleFrom(
                        backgroundColor: const Color(
                          0xFF3F51B5,
                        ), // Button color
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(30),
                        ),
                        padding: const EdgeInsets.symmetric(
                          horizontal: 24,
                          vertical: 12,
                        ),
                      ),
                      child: Text(
                        _currentPage == _onboardingData.length - 1
                            ? 'Done'
                            : 'Next >',
                        style: GoogleFonts.poppins(
                          color: Colors.white,
                          fontSize: 16,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class OnboardingContent extends StatelessWidget {
  final String image;
  final String title;
  final String description;
  final String highlight; // Word to highlight in blue

  const OnboardingContent({
    Key? key,
    required this.image,
    required this.title,
    required this.description,
    required this.highlight,
  }) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return Column(
      mainAxisAlignment: MainAxisAlignment.center,
      children: [
        Expanded(
          flex: 3,
          child: Padding(
            padding: const EdgeInsets.all(20.0),
            child: Image.asset(image),
          ),
        ),
        Expanded(
          flex: 2,
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 24.0),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  title,
                  style: GoogleFonts.poppins(
                    fontSize: 28,
                    fontWeight: FontWeight.bold,
                    color: const Color(0xFF3F51B5), // Blue title
                    height: 1.2,
                  ),
                  textAlign: TextAlign.center, // Centered title based on image
                ),
                const SizedBox(height: 16),
                _buildRichText(description, highlight),
              ],
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildRichText(String text, String highlight) {
    // Basic implementation to highlight a specific word
    // This assumes the highlight word is unique in the string for simplicity
    List<String> parts = text.split(highlight);

    // Fallback if highlight not found correctly or multiple occurrences logic needed
    // For this simple case:
    return RichText(
      textAlign: TextAlign.start,
      text: TextSpan(
        style: GoogleFonts.poppins(
          fontSize: 18,
          color: Colors.white,
          height: 1.5,
        ),
        children: [
          if (parts.isNotEmpty) TextSpan(text: parts[0]),
          if (parts.length > 1 || text.endsWith(highlight))
            TextSpan(
              text: highlight,
              style: GoogleFonts.poppins(
                fontSize: 18,
                color: const Color(0xFF3F51B5),
                fontWeight: FontWeight.bold,
              ),
            ),
          if (parts.length > 1) TextSpan(text: parts[1]),
        ],
      ),
    );
  }
}
