/*
 * Gpio.cpp
 *
 *  Created on: 18 de jul de 2017
 *      Author: ermiston.tavares
 */

#include <iostream>
#include <fstream>
#include <stdio.h>
#include <stdlib.h>
#include <cstring>

#define HIGH "1"
#define LOW "0"
#define OUT "out"
#define IN "in"

using namespace std;

class Gpio {

	private:
		char* gpio_pin;

	public:
		Gpio(char*);
		void setDirection(char*);
		void setValue(char*);
		char* getDirection();
		char* getValue();
		void setHigh();
		void setLow();
		void setOut();
		void setIn();
};
	/*
	 * gets the pin defined by the integer. This number does not always
	 * correspond with the pin number: For example, on the IFC6410, GPIO pin 21
	 * corresponds to the operating system pin number 6.
	 */
	Gpio::Gpio(char* pin) {
		cout << "Initializing pin " << pin << endl;
		gpio_pin = pin;
	}

	/**
	 * Set pin direction.
	 * @param pin Desirable pin.
	 * @param pin Direction of pin.
	 *      in -> Input.
	 *      out -> Output.
	 *
	 */
	void Gpio::setDirection(char* direction) {
		cout << "Setting Direction" << endl;

		char destination[100];

    	sprintf(destination, "/sys/class/gpio/gpio%s/direction", gpio_pin);

		FILE *fp;

		fp = fopen(destination, "w");

		if(fp == NULL) {
		    puts("Error open file");
		    exit(EXIT_FAILURE);
		}

		fprintf(fp, "%s",direction);
		fclose(fp);
	}

	/**
	 * Set pin value.
	 * @param pin Desirable pin.
	 * @param value Value of pin.
	 * 	0 -> Low Level.
	 *	1 -> High Level
	 */
	void Gpio::setValue(char* value) {
		cout << "Setting value" << endl;

		char destination[100];

		sprintf(destination, "/sys/class/gpio/gpio%s/value", gpio_pin);

		FILE *fp;

		fp = fopen(destination, "w");
		fprintf(fp, value);
		fclose(fp);
	}

	/*Get pin direction.
		in -> Input.
		out -> Output.
	*/
	char* Gpio::getDirection() {

		cout << "Getting Direction" << endl;

		FILE *fp;
	    char buff[255];
	    char destination[100];

	    sprintf(destination, "/sys/class/gpio/gpio%s/direction", gpio_pin);

	    fp = fopen(destination, "r");
	    fscanf(fp, "%s", buff);
	    printf("%s\n", buff );

	    fclose(fp);

	    char *direction = (char*)calloc(1024, sizeof(buff));
	    strcpy(direction, buff);

	    return direction;

	}


	/*Get pin value.
		0 -> Low Level.
		1 -> High Level
	*/
	char* Gpio::getValue() {

		cout << "Getting value" << endl;

	    FILE *fp;
	    char buff[255];
	    char destination[100];

	    sprintf(destination, "/sys/class/gpio/gpio%s/value", gpio_pin);

	    fp = fopen(destination, "r");
	    fscanf(fp, "%s", buff);
	    printf("%s\n", buff );

	    fclose(fp);

	    char *value = (char*)calloc(1024, sizeof(buff));
	    strcpy(value, buff);

	    return value;

	}

	/* sets pin high */
	void Gpio::setHigh() {
		setValue((char *)HIGH);
	}

	/* sets pin low */
	void Gpio::setLow() {
		setValue((char *)LOW);
	}

	/* sets pin to output */
	void Gpio::setOut() {
		setDirection((char *)"out");
	}

	/* sets pin to input */
	void Gpio::setIn() {
		setDirection((char *)"in");
	}





