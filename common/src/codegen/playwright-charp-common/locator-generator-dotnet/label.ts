import { ILocatorTemplateParam } from "../../types";
import { escapeStr } from "../../utils/stringUtils";

/** Genrates Csharp code of Locator Label */
export default (params: ILocatorTemplateParam) => {
  return params.hasParams
    ? `this._page.GetByLabel(string.Format(\"${escapeStr(params.locatorStr)}\", parameters))`
    : `this._page.GetByLabel(\"${escapeStr(params.locatorStr)}\")`;
};
