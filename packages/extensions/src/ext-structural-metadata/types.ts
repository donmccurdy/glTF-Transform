export type ClassPropertyType =
	| 'SCALAR'
	| 'VEC2'
	| 'VEC3'
	| 'VEC4'
	| 'MAT2'
	| 'MAT3'
	| 'MAT4'
	| 'STRING'
	| 'BOOLEAN'
	| 'ENUM';

export type ClassPropertyComponentType =
	| 'INT8'
	| 'UINT8'
	| 'INT16'
	| 'UINT16'
	| 'INT32'
	| 'UINT32'
	| 'INT64'
	| 'UINT64'
	| 'FLOAT32'
	| 'FLOAT64';

export type EnumValueType = 'INT8' | 'UINT8' | 'INT16' | 'UINT16' | 'INT32' | 'UINT32' | 'INT64' | 'UINT64';

export type PropertyTablePropertyOffsetType = 'UINT8' | 'UINT16' | 'UINT32' | 'UINT64';
