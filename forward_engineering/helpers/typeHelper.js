const getExtensions = require('./extensionsHelper');

function getType(data) {
	if (!data) {
		return;
	}

	if (Array.isArray(data.type)) {
		return getType(Object.assign({}, data, { type: data.type[0] }));
	}

	if (hasRef(data)) {
		return getRef(data);
	}
	
	return getTypeProps(data);
}

function getTypeProps(data) {
	const { type, properties, items, required } = data;

	switch (type) {
		case 'array': {
			const arrayProps = {
				type,
				items: getArrayItemsType(items),
				collectionFormat: data.collectionFormat,
				minItems: data.minItems,
				maxItems: data.maxItems,
				uniqueItems: data.uniqueItems || undefined,
				discriminator: data.discriminator,
				readOnly: data.readOnly,
				xml: getXml(data.xml),
			};
			const arrayChoices = getChoices(data);

			return Object.assign({}, arrayProps, arrayChoices);
		}
		case 'object': {
			const objectProps = {
				type,
				description: data.description || undefined,
				required: required || undefined,
				properties: getObjectProperties(properties),
				minProperties: data.minProperties,
				maxProperties: data.maxProperties,
				additionalProperties: getAdditionalProperties(data),
				discriminator: data.discriminator,
				readOnly: data.readOnly,
				example: parseExample(data.sample),
				xml: getXml(data.xml)
			};
			const objectChoices = getChoices(data);

			return Object.assign({}, objectProps, objectChoices);
		}
		case 'parameter':
			if (!properties || properties.length === 0) {
				return;
			}
			return getType(properties[Object.keys(properties)[0]]);
		default:
			return getPrimitiveTypeProps(data);
	}
}

function getRef({ $ref: ref }) {
	if (ref.startsWith('#')) {
		return { $ref: ref.replace('#model/definitions', '#/components') };
	}
	return { $ref: ref };
}

function hasRef(data = {}) {
	return data.$ref ? true : false;
}

function getArrayItemsType(items) {
	if (Array.isArray(items)) {
		return Object.assign({}, items.length > 0 ? getType(items[0]) : {});
	}
	return Object.assign({}, items ? getType(items) : {});
}

function getObjectProperties(properties) {
	if (!properties) {
		return;
	}
	return Object.keys(properties).reduce((acc, propName) => {
		acc[propName] = getType(properties[propName]);
		return acc;
	}, {});
}

function getXml(data) {
	if (!data) {
		return undefined;
	}

	return Object.assign({}, {
		name: data.xmlName,
		namespace: data.xmlNamespace,
		prefix: data.xmlPrefix,
		attribute: data.xmlAttribute,
		wrapped: data.xmlWrapped
	}, getExtensions(data.scopesExtensions));
}

function getPrimitiveTypeProps(data) {
	return {
		type: data.type,
		format: data.format || data.mode,
		description: data.description,
		exclusiveMinimum: data.exclusiveMinimum,
		exclusiveMaximum: data.exclusiveMaximum,
		minimum: data.minimum,
		maximum: data.maximum,
		enum: data.enum,
		pattern: data.pattern,
		default: data.default,
		minLength: data.minLength,
		maxLength: data.maxLength,
		multipleOf: data.multipleOf,
		xml: getXml(data.xml),
		example: data.sample
	};
}

function getAdditionalProperties(data) {
	const getAdditionalPropsObject = (data) => {
		if (!data) {
			return;
		}
		if (data.additionalPropertiesObjectType === 'integer') {
			return {
				type: data.additionalPropertiesObjectType,
				format: data.additionalPropertiesIntegerFormat
			}
		}
		return { type: data.additionalPropertiesObjectType };
	}

	if (!data.additionalPropControl) {
		return;
	}
	
	if (data.additionalPropControl === 'Boolean') {
		return data.additionalProperties || undefined;
	}
	
	return getAdditionalPropsObject(data);
}

function getChoices(data) {
	const choices = {};
	const multipleChoices = ['allOf', 'anyOf', 'oneOf'];
	multipleChoices.forEach(choiceName => {
		if (data[choiceName]) {
			choices[choiceName] = data[choiceName].map(getType);
		}
	})
	if (data.not) {
		choices.not = getType(data.not);
	}

	return choices;
}

function hasChoice(data) {
	if (!data) {
		return false;
	}
	if (data.allOf || data.anyOf || data.oneOf || data.not) {
		return true;
	}
	return false;
}

function parseExample(data) {
	try {
		return JSON.parse(data);
	} catch(err) {
		return data;
	}
}

module.exports = {
	getType,
	getRef,
	hasRef,
	hasChoice
};