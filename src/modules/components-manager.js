/**
 * Provides methods to manipulate the components. The data is cached as well
 * as updated in the database.
 * 
 * @module components-manager
 * @author Luka Kralj
 * @version 1.0
 */

module.exports = {
    getComponents,
    toggleComponent,
    updateComponent,
    addComponent,
    removeComponent,
    getINComponentsValues
}

const gpio = require('./Gpio');
const Gpio = gpio.Gpio;
const queryController = require('./../util/db/query-controller');
const logger = require('./../util/logger');
const cli = require('./../cli');

/**
 * Mapping of all the components that are currently being used.
 * {
 *      id: {
 *          name: String,
 *          description: String,
 *          gpio: [Gpio Object]
 *      }
 * }
 */
const components = {};
init();

cli.registerCommand("stop", onStop);
cli.registerCommand("components", printComponents);

async function printComponents() {
    console.log(components);
}

/**
 * Loads all the components, if any, from the database and creates a lookup table
 * for faster access.
 */
async function init() {
    const comp = await queryController.getComponents();

    for (const i in comp) {
        const c = comp[i];
        try {
            components[c.id] = {
                name: c.name,
                description: c.description,
                physicalPin: c.physicalPin,
                direction: c.direction,
                gpio: new Gpio(c.physicalPin, (c.direction == "out") ? gpio.DIR_OUT : gpio.DIR_IN)
            };
            await components[c.id].gpio.init();
        }
        catch (err) {
            logger.error(err);
            logger.warning("Component: " + c.name + " was not initialised correctly.")
        }
    }
}

/**
 * Retrieves the current state off all the components.
 * 
 * @returns {Array] Array of all the components.
 */
async function getComponents() {
    const res = [];
    for (const id in components) {
        const c = components[id];
        const toAdd = {
            id: id,
            physicalPin: c.physicalPin,
            direction: c.direction,
            name: c.name,
            description: c.description
        };
        if (c.direction == gpio.DIR_OUT) {
            toAdd.isOn = await c.gpio.isOn();
        }
        else {
            toAdd.curValue = await c.gpio.readValue();
        }
        res.push(toAdd);
    }
    return res;
}

/**
 * Combines the values of all the IN components.
 * 
 * @returns {Array} Array of all the values.
 */
async function getINComponentsValues() {
    const mapIdVal = {};
    for (const id in components) {
        const c = components[id];
        if (c.direction == gpio.DIR_IN) {
            const val = await c.gpio.readValue();
            mapIdVal[id] = val;
        }
    }
    return mapIdVal;
}

/**
 * Change the state of the OUT component.
 * 
 * @param {Number} id ID of the component.
 * @param {string} status Either "on" or "off".
 * @returns {boolean} True if operation was successful, false if not.
 */
async function toggleComponent(id, status) {
    if (components[id].direction != gpio.DIR_OUT || (status != "on" && status != "off")) {
        throw new Error("Invalid toggle request.");
    }

    if (status == "on") {
        if (await components[id].gpio.turnOn()) {
            return true;
        }
    }
    else {
        if (await components[id].gpio.turnOff()) {
            return true;
        }
    }
    return false;
}

/**
 * Update component.
 * 
 * @param {Number} id ID of the component.
 * @param {JSON} data Data that we want to update.
 * @returns {boolean} True if operation was successful, false if not.
 */
async function updateComponent(id, data) {
    // Prepare data for update.
    if (!data) data = {};
    const c = components[id];
    if (!data.physicalPin) {
        data.physicalPin = c.physicalPin;
    }
    if (!data.direction) {
        data.direction = c.direction;
    }
    if (!data.name) {
        data.name = c.name;
    }
    if (!data.description) {
        data.description = c.description;
    }

    return await executeUpdate(id, data);
}

/**
 * This method actually executed the update.
 * 
 * @param {Number} id ID of the component.
 * @param {JSON} data Data that we want to update.
 * @returns {boolean} True if operation was successful, false if not.
 */
async function executeUpdate(id, data) {
    const c = components[id];

    if (data.direction != c.direction ||
        data.physicalPin != c.physicalPin) {
        // Need to reexport the pin
        if (c.direction == gpio.DIR_OUT) {
            // turn off first
            await c.gpio.turnOff();
        }
        try {
            await c.gpio.unexport();
            c.gpio = new Gpio(data.physicalPin, data.direction);
            await c.gpio.init();
        }
        catch (err) {
            logger.error(err);
            return false;
        }
    }

    c.name = data.name;
    c.direction = data.direction;
    c.physicalPin = data.physicalPin;
    c.description = data.description;

    queryController.updateComponent(id, data.physicalPin, data.direction, data.name, data.description);
    return true;
}

/**
 * Creates a new component with the given data.
 * 
 * @param {JSON} data Component data.
 * @returns {Number} The ID assigned to the new component.
 */
async function addComponent(data) {
    if (!data.physicalPin || !data.direction || !data.name) {
        return undefined;
    }

    const res = await queryController.addComponent(data.physicalPin, data.direction, data.name, data.description);
    if (!res.success) {
        logger.warning(JSON.stringify(res));
        return undefined;
    }

    const id = res.response.insertId;
    try {
        components[id] = {
            name: data.name,
            description: data.description,
            physicalPin: data.physicalPin,
            direction: data.direction,
            gpio: new Gpio(data.physicalPin, (data.direction == "out") ? gpio.DIR_OUT : gpio.DIR_IN)
        };
        await components[id].gpio.init();
    }
    catch (err) {
        logger.error(err);
        logger.warning("Component: " + data.name + " was not initialised correctly.")
    }
    return id;
}

/**
 * Removes the component.
 * 
 * @param {Number} id ID of the component.
 * @returns {boolean} True if operation was successful, false if not.
 */
async function removeComponent(id) {
    try {
        if (components[id].direction == gpio.DIR_OUT) {
            await components[id].gpio.turnOff();
        }
        await components[id].gpio.unexport();
        delete components[id];
    }
    catch(err) {
        logger.error(err);
        return false;
    }

    queryController.removeComponent(id);
    return true;
}

/**
 * Must be called before the server exits to export all the pins.
 */
async function onStop() {
    for (const id in components) {
        try {
            await components[id].gpio.unexport();
        }
        catch(err) {
            logger.error(err);
            logger.warning("Component: " + components[id].name + " was not unexported correctly.");
        }
    }
}