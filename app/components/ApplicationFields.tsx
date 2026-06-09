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
        <span>Brand name</span>
        <input id={`${idPrefix}brandName`} type="text" value={value.brandName} onChange={set("brandName")} placeholder="OLD TOM DISTILLERY" />
      </label>
      <label className="field">
        <span>Class / type</span>
        <input id={`${idPrefix}classType`} type="text" value={value.classType} onChange={set("classType")} placeholder="Kentucky Straight Bourbon Whiskey" />
      </label>
      <label className="field">
        <span>Alcohol content</span>
        <input id={`${idPrefix}alcoholContent`} type="text" value={value.alcoholContent} onChange={set("alcoholContent")} placeholder="45% Alc./Vol. (90 Proof)" />
      </label>
      <label className="field">
        <span>Net contents</span>
        <input id={`${idPrefix}netContents`} type="text" value={value.netContents} onChange={set("netContents")} placeholder="750 mL" />
      </label>
      <label className="field">
        <span>Beverage type</span>
        <select id={`${idPrefix}beverageType`} value={value.beverageType} onChange={set("beverageType")}>
          <option value="spirits">Distilled spirits</option>
          <option value="wine">Wine</option>
          <option value="beer">Beer / malt</option>
        </select>
      </label>
    </>
  );
}
