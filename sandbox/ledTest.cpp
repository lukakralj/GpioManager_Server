#include <iostream>
#include <string>
#include <vector>
#include "../lib/GpioProcessor.h"
using namespace std;

GpioProcessor* gpioProcessor = nullptr;
Gpio* ledPin = nullptr;

/*
CLI to turn an LED on Dragonboard on and off.
*/
int main() {
	gpioProcessor = new GpioProcessor();

	cout << "Hello.\nType 'q' to quit or 'h' for help." << endl;
	bool finish = false;
	do {
		string input;
		getline(cin, input);

		vector<string> tokens = parseInput(input);

		if (tokens.size() == 0) {
			cout << "Please enter a command first..." << endl;
		}
		else if (tokens[0] == "q") {
			cout << "Goodbye!" << endl;
			finish = true;
		}
		else if (tokens[0] == "h") {
			printHelp();
		}
		else if (tokens[0] == "use") {
			if (tokens.size() > 1) {
				usePin(tokens[1]);
			}
			else {
				cout << "Missing second argument." << endl;
			}
		}
		else if (tokens[0] == "led") {
			if (tokens.size() > 1) {
				toggleLed(tokens[1]);
			}
			else {
				cout << "Missing second argument." << endl;
			}
		}
		else {
			cout << "Invalid command." << endl;
		}
	} while (finish);

	gpioProcessor->cleanPins();
	delete (gpioProcessor);
	delete (ledPin);
	return 0;
}

/*
Turn an LED on or off.
*/
void toggleLed(string& mode) {
	if (ledPin == nullptr) {
		cout << "Set the pin to use first." << endl;
	}
	else if (mode == "on") {
		ledPin->setOut();
		ledPin->setHigh();
	}
	else if (mode == "off") {
		ledPin->setOut();
		ledPin->setLow();
	}
	else {
		cout << "Invalid led mode. Must be 'on' or 'off'." << endl;
	}
}

/*
Specify which pin to use with the following commands.
*/
void usePin(string& pin) {
	if (pin == "23") {
		ledPin = gpioProcessor->getPin23();
	}
	else if (pin == "24") {
		ledPin = gpioProcessor->getPin24();
	}
	else if (pin == "25") {
		ledPin = gpioProcessor->getPin25();
	}
	else if (pin == "26") {
		ledPin = gpioProcessor->getPin26();
	}
	else if (pin == "27") {
		ledPin = gpioProcessor->getPin27();
	}
	else if (pin == "28") {
		ledPin = gpioProcessor->getPin28();
	}
	else if (pin == "29") {
		ledPin = gpioProcessor->getPin29();
	}
	else if (pin == "30") {
		ledPin = gpioProcessor->getPin30();
	}
	else if (pin == "31") {
		ledPin = gpioProcessor->getPin31();
	}
	else if (pin == "32") {
		ledPin = gpioProcessor->getPin32();
	}
	else if (pin == "33") {
		ledPin = gpioProcessor->getPin33();
	}
	else if (pin == "34") {
		ledPin = gpioProcessor->getPin34();
	}
	else {
		cout << "Invalid pin. Must be between 23 and 34." << endl;
	}
}

/*
Display instructions on how to use the CLI.
*/
void printHelp() {
	cout << "Type 'use x' to use pin x." << endl;
	cout << "Type 'led on/off' to turn the led on/off." << endl;
	cout << "Type 'q' to quit or 'h' for help." << endl;
}

/*
Parse a line into a list of tokens. Spaces are removed.
*/
vector<string> parseInput(string& s) {
	vector<string> tokens;
	size_t found;
	do {
		trim(s);
		found = s.find(' ');
		if (found == string::npos) {
			if (s.length() > 0) {
				tokens.push_back(s);
			}
		}
		else {
			tokens.push_back(s.substr(0, found));
		}
	} while (found != string::npos);

	return tokens;
}

/*
Trim spaces on both sides of a string, but not in between.
*/
void trim(string& s) {
	ltrim(s);
	rtrim(s);
}

/*
Trim spaces on the left.
*/
void ltrim(string& s) {
	while (s.length() > 0 && s[0] == ' ') {
		s.erase(0, 1);
	}
}

/*
Trim spaces on the left.
*/
void rtrim(string& s) {
	while (s.length() > 0 && s[s.length() - 1] == ' ') {
		s.erase(s.length() - 1, 1);
	}
}