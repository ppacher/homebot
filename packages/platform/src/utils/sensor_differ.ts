import {IterableDiffer, IterableChangeRecord, IterableChanges, createIterableDiffer} from '@homebot/core';
import {SensorSchema} from '../devices';

export interface SensorDiff {
    /** Wether or not the sensor description has changed */
    hasDescriptionChanged(): boolean;

    /** Wether or not the sensor type has changed */
    hasTypeChanged(): boolean;
    
    /** Returns the new sensor schema */
    getSchema(): SensorSchema;
}

class SensorDiff_ implements SensorDiff {
    constructor(
        private _hasDescriptionChanged: boolean,
        private _hasTypeChanged: boolean,
        private _schema: SensorSchema,
    ) {}

    hasDescriptionChanged(): boolean {
        return this._hasDescriptionChanged;
    }
    
    hasChanged(): boolean {
        return this.hasDescriptionChanged();
    }
    
    hasTypeChanged(): boolean {
        return this._hasTypeChanged;
    }

    getSchema(): SensorSchema {
        return this._schema;
    }
}

export function getSensorDiff(oldSensor: SensorSchema, newSensor: SensorSchema): SensorDiff|null {
    // the name of the sensor is not allowed to change
    if (oldSensor.name !== newSensor.name) {
        throw new Error(`Cannot diff sensors with different names`);
    }
    
    let descriptionChanged = oldSensor.description !== newSensor.description;
    let typeChanged = oldSensor.type !== newSensor.type;
    
    if (descriptionChanged || typeChanged) {
        return new SensorDiff_(descriptionChanged, typeChanged, newSensor);
    }
    
    return null;
}

/**
 * a {@link @homebot/core:TrackByFunction} for {@link SensorSchema}
 */
export function SensorTrackByFunction(idx: number, sensor: SensorSchema): any {
    return sensor.name;
}

export interface IterableSensorChanges {
    /**
     * Invokes the provided callback function for each new sensor
     */
    forEachNewSensor(cb: (record: IterableChangeRecord<SensorDiff>)=>void): void;
    
    /**
     * Invokes the provided callback function for each deleted sensor
     */
    forEachDeletedSensor(cb: (record: IterableChangeRecord<SensorDiff>)=>void): void;
    
    /**
     * Invokes the provided callback function for each changed/updated sensor
     */
    forEachChangedSensor(cb: (record: IterableChangeRecord<SensorDiff>)=>void): void;
}

export interface IterableSensorDiffer {
    /**
     * Searches for differences witihn the SensorSchema iterable.
     * Returns null if no changes occured
     */
    diff(sensors: Iterable<SensorSchema>|SensorSchema[]): IterableSensorChanges|null;
}

class IterableSensorChangeRecord implements IterableChangeRecord<SensorDiff> {
    constructor(
        public readonly trackById: any,
        public readonly item: SensorDiff
    ) {}
}

class IterableSensorDiffer_ implements IterableSensorChanges, IterableSensorDiffer {
    /** our internal iterable differ for tracking changes */
    private _iterableDiffer = createIterableDiffer(SensorTrackByFunction);
    private _changes: IterableChanges<SensorSchema>|null = null;

    diff(sensors: Iterable<SensorSchema>|SensorSchema[]): IterableSensorChanges|null {
        this._changes = this._iterableDiffer.diff(sensors);
        
        if (this._changes === null) {
            return null;
        }
        
        return this;
    }
    
    forEachNewSensor(cb: (record: IterableChangeRecord<SensorDiff>)=>void): void {
        this._changes!.forEachNewIdentity(schema => {
            let diff = new SensorDiff_(false, false, schema.item);
            let record = new IterableSensorChangeRecord(schema.trackById, diff);
            
            cb(record);
        });
    }
    
    forEachDeletedSensor(cb: (record: IterableChangeRecord<SensorDiff>)=>void): void {
        this._changes!.forEachDeletedIdentity(schema => {
            let diff = new SensorDiff_(false, false, schema.item);
            let record = new IterableSensorChangeRecord(schema.trackById, diff);
            
            cb(record);
        });
    }
    
    forEachChangedSensor(cb: (record: IterableChangeRecord<SensorDiff>)=>void): void {
        this._changes!.forEachIdentityChanged((schema, oldSensor) => {
            let diff = getSensorDiff(oldSensor, schema.item);
            let record = new IterableSensorChangeRecord(schema.trackById, diff!);
            
            cb(record);
        });
    }
}

export function createIterableSensorDiffer(): IterableSensorDiffer {
    return new IterableSensorDiffer_();
}