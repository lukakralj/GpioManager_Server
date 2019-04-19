/*
 This class abstracts the use of the gpio pins. This class can be utilized on any linux operating
 system that has gpio pins defined in the /sys/class/gpio directory. It is required that the gpio
 pins themselves are available for access by the user of this application, and may require a
 change of permissions.
 */

#include "Gpio.h"
#include <vector>


#define PATH_EXPORT "/sys/class/gpio/export"
#define PATH_UNEXPORT "/sys/class/gpio/unexport"


class GpioProcessor {

	private:
	    vector<char*> pins;

	public:
		GpioProcessor();
		Gpio* getPin(char*);
		Gpio* getPin23();
		Gpio* getPin24();
		Gpio* getPin25();
		Gpio* getPin26();
		Gpio* getPin27();
		Gpio* getPin28();
		Gpio* getPin29();
		Gpio* getPin30();
		Gpio* getPin31();
		Gpio* getPin32();
		Gpio* getPin33();
		Gpio* getPin34();
		void exportPin(char*);
		void unexportPin(char*);
		void cleanPins();

};


	GpioProcessor::GpioProcessor() {}

	Gpio* GpioProcessor::getPin(char* pin) {
		exportPin(pin);
		pins.push_back(pin);
		return new Gpio(pin);
	}


	/**
	 * Get pin 23;
	 * @returns {Gpio}
	 */
	Gpio* GpioProcessor::getPin23() {
		return getPin((char *)"36");
	}

	/**
	 * Get pin 24.
	 * @returns {Gpio}
	 */
	Gpio* GpioProcessor::getPin24() {
		return getPin((char *)"12");
	}

	/**
	 * Get pin 25.
	 * @returns {Gpio}
	 */
	Gpio* GpioProcessor::getPin25() {
		return getPin((char *)"13");
	}


	/**
	 * Get pin 26.
	 * @returns {Gpio}
	 */
	Gpio* GpioProcessor::getPin26() {
		return getPin((char *)"69");
	}

	/**
	 * Get pin 27.
	 * @returns {Gpio}
	 */
	Gpio* GpioProcessor::getPin27() {
		return getPin((char *)"115");
	}

	/**
	 * Get pin 28.
	 * @returns {Gpio}
	 */
	Gpio* GpioProcessor::GpioProcessor::getPin28() {
		return getPin((char *)"901");
	}

	/**
	 * Get pin 29.
	 * @returns {Gpio}
	 */
	Gpio* GpioProcessor::getPin29() {
		return getPin((char *)"24");
	}

	/**
	 * Get pin 30.
	 * @returns {Gpio}
	 */
	Gpio* GpioProcessor::getPin30() {
		return getPin((char *)"25");
	}

	/**
	 * Get pin 31.
	 * @returns {Gpio}
	 */
	Gpio* GpioProcessor::getPin31() {
		return getPin((char *)"35");
	}

	/**
	 * Get pin 32.
	 * @returns {Gpio}
	 */
	Gpio* GpioProcessor::getPin32() {
		return getPin((char *)"34");
	}

	/**
	 * Get pin 33.
	 * @returns {Gpio}
	 */
	Gpio* GpioProcessor::getPin33() {
		return getPin((char *)"28");
	}

	/**
	 * Get pin 34.
	 * @returns {Gpio}
	 */
	Gpio* GpioProcessor::getPin34() {
		return getPin((char *)"33");
	}


	/**
	 * Enable access to GPIO.
	 * @param pin GPIO pin to access.
	 */
	void GpioProcessor::exportPin(char* pin) {

		cout << "Exporting pin " << pin << endl;

		FILE *fp;

		fp = fopen(PATH_EXPORT, "w");

		if(fp == NULL) {
		    puts("Error open file");
		}

		fprintf(fp, pin);
		fclose(fp);

	}

	/**
	 * Disable access to GPIO.
	 * @param pin GPIO pin to disable access.
	 */
	void GpioProcessor::unexportPin(char* pin) {

		cout << "Unexport pin " << pin << endl;
		FILE *fp;

		fp = fopen(PATH_UNEXPORT, "w");
		fprintf(fp, pin);
		fclose(fp);

	}

	void GpioProcessor::cleanPins() {
		for (unsigned i = 0; i < pins.size(); i++) {
			unexportPin(pins[i]);
		}
		pins.clear();
	}
