export interface SourceMapInfo {
  file: string | null;
  sourceRoot: string | null;
  sources: number;
  names: number;
  mappings: number;
  rangeMappings: number;
  lines: number;
  sourcesWithContent: number;
  totalContentSize: number;
  fileSize: number;
  ignoreList: number[];
  debugId: string | null;
}

export interface LookupResult {
  source: string;
  line: number;
  column: number;
  name: string | null;
  context?: ContextLine[];
}

export interface ContextLine {
  line: number;
  text: string;
  highlight: boolean;
}

export interface ResolveResult {
  line: number;
  column: number;
}

export interface SourceEntry {
  index: number;
  source: string;
  hasContent: boolean;
  contentSize: number | null;
  ignored: boolean;
}

export interface SourcesList {
  sources: SourceEntry[];
  total: number;
  withContent: number;
}

export interface ExtractResult {
  extracted: { source: string; file: string; size: number }[];
  skipped: string[];
  total: number;
}

export interface FetchResult {
  bundle: {
    url: string;
    file: string;
    size: number;
  };
  sourceMap: {
    url: string;
    file: string;
    size: number;
  } | null;
}

export interface MappingEntry {
  generatedLine: number;
  generatedColumn: number;
  source: string | null;
  originalLine: number;
  originalColumn: number;
  name: string | null;
  isRangeMapping: boolean;
}

export interface MappingsResult {
  mappings: MappingEntry[];
  total: number;
  offset: number;
  limit: number;
  hasMore: boolean;
}
