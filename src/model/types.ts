export type XsdType = 
    | 'xs:string' 
    | 'xs:decimal'
    | 'xs:integer'
    | 'xs:boolean'
    | 'xs:date'
    | 'xs:time'
    | CustomType;

export type CustomType = {
    name: string;
    base: XsdType;
    restriction?: {
        minInclusive?: string;
        maxInclusive?: string;
        pattern?: string;
    };
};

export type OccurrenceConstraints = {
    minOccurs?: number;
    maxOccurs?: number | 'unbounded';
};

export type SchemaValidationOptions = {
    checkUniqueNames: boolean;
    checkTypeReferences: boolean;
    checkNamespaceConsistency: boolean;
};

export type RestrictionType = 'minExclusive' | 'minInclusive' | 'maxExclusive' | 'maxInclusive' | 'totalDigits' | 'fractionDigits' | 'length' | 'minLength' | 'maxLength' | 'enumeration' | 'whiteSpace' | 'pattern';
