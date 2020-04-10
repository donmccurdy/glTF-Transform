export function GraphChild (target: any, propertyKey: string) {
    Object.defineProperty(target, propertyKey, {
        get: function () {
            return this['_' + propertyKey];
        },
        set: function (value) {
            const link = this['_' + propertyKey];

            if (link && !Array.isArray(link)) {
                // console.log('[GraphChild] Disposing link: ' + propertyKey, link, value);
                link.dispose();
            }

            if (value && !Array.isArray(value)) {
                // This listener handles dispose events for property Links. The addGraphChild
                // method handles the events for arrays of Links.
                value.onDispose(() => {
                    // console.log('[GraphChild] Unassigning link: ' + propertyKey, link);
                    this['_' + propertyKey] = null;
                });
            }

            // if (value) console.log('[GraphChild] Assigning link: ' + propertyKey, value);
            this['_' + propertyKey] = value;
        },
        enumerable: true
    });
}

export function GraphChildList (target: any, propertyKey: string) {}
