"use client";

import type { ApplicationData } from "@/lib/types";

interface Props {
  value: ApplicationData;
  onChange: (next: ApplicationData) => void;
  idPrefix?: string;
}

export function ApplicationFields({ value, onChange, idPrefix = "" }: Props) {
  const set = (k: keyof ApplicationData) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    onChange({ ...value, [k]: e.target.value });

  return (
    <>
      <label className="field">
        <span className="lbl">Brand name</span>
        <span className="help">The brand exactly as it appears on the application.</span>
        <input id={`${idPrefix}brandName`} type="text" value={value.brandName} onChange={set("brandName")} placeholder="e.g. OLD TOM DISTILLERY" />
      </label>
      <label className="field">
        <span className="lbl">Class / type</span>
        <span className="help">What the product is (the designation on the form).</span>
        <input id={`${idPrefix}classType`} type="text" value={value.classType} onChange={set("classType")} placeholder="e.g. Kentucky Straight Bourbon Whiskey" />
      </label>
      <label className="field">
        <span className="lbl">Alcohol content</span>
        <span className="help">Percentage or proof, however the form states it.</span>
        <input id={`${idPrefix}alcoholContent`} type="text" value={value.alcoholContent} onChange={set("alcoholContent")} placeholder="e.g. 45% Alc./Vol. (90 Proof)" />
      </label>
      <label className="field">
        <span className="lbl">Net contents</span>
        <span className="help">The bottle size on the form.</span>
        <input id={`${idPrefix}netContents`} type="text" value={value.netContents} onChange={set("netContents")} placeholder="e.g. 750 mL" />
      </label>
      <label className="field">
        <span className="lbl">Beverage type</span>
        <span className="help">Used to apply the right label rules.</span>
        <select id={`${idPrefix}beverageType`} value={value.beverageType} onChange={set("beverageType")}>
          <option value="spirits">Distilled spirits</option>
          <option value="wine">Wine</option>
          <option value="beer">Beer / malt</option>
        </select>
      </label>
    </>
  );
}
