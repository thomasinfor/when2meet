"use client"
import React from "react";
import { useState, useEffect, useMemo, useCallback, useContext, createContext } from "react";
import TimeTable from "@/components/TimeTable";
import BaseGrid from "@/components/BaseGrid";
import { colorScale, tableMap, defaultTime, defaultDate, defaultDuration, slotBefore, sum } from "@/utils";

const Context = createContext(false);

function Grid({ ...p }) {
  // const theme = useTheme();
  const { focus, level, maxPeople, highlightRange: range, ratio } = useContext(Context);
  const focused = focus && p.i == focus[0] && p.j == focus[1];
  const style = { fontSize: '4px' };
  if (ratio)
    Object.assign(style, { background: colorScale('#339900', ratio[p.i][p.j]) });
  else
    Object.assign(style, { background: "gray" });
  if (focused)
    Object.assign(style, { border: '1px solid red' });
  if (range && slotBefore(range[0], [p.i, p.j]) && slotBefore([p.i, p.j], range[1]))
    Object.assign(style, { background: '#FFFF00' });
  return (
    <BaseGrid {...p} style={style}>
      <div style={{ transform: 'scale(2.5)' }}>
        {focused && maxPeople !== 0 && `${level[p.i][p.j]}/${maxPeople}`}
      </div>
    </BaseGrid>
  );
}

export default function ViewTimeTable({
  value, focus: p_focus, setFocus: p_setFocus=()=>{},
  time=defaultTime, date=defaultDate, duration=defaultDuration,
  highlightRange=false, weight=false,
  keepFocus=false, ...props
}) {
  const EMPTY_TABLE = useMemo(() => new Array(time[1] - time[0]).fill(0).map(() => new Array(duration).fill(false)), [time, duration]);
  const [_focus, _setFocus] = useState(null);
  const setFocus = useCallback((...x) => { _setFocus(...x); p_setFocus(...x); }, [_setFocus, p_setFocus]);
  useEffect(() => { if (p_focus !== undefined) _setFocus(p_focus) }, [p_focus]);
  const focus = useMemo(() => p_focus === undefined ? _focus : p_focus, [p_focus, _focus]);

  const enter = useCallback((i, j) => {
    setFocus([i, j]);
  }, [setFocus]);
  const up = useCallback((i=false, j=false) => {
    if (!keepFocus && (i === false || j === false))
      setFocus(null);
  }, [setFocus, keepFocus]);

  // const totalPeople = useMemo(() => Object.keys(value).length, [value]);
  const available = useMemo(() => tableMap(EMPTY_TABLE, (_, i, j) =>
      Object.values(value).filter(v => v.table[i][j]).map(e => e[0])), [value, EMPTY_TABLE]);
  const maxPeople = useMemo(() => available.flat().reduce((a, c) => Math.max(a, c.length), 0), [available]);
  const level = useMemo(() => tableMap(available, e => maxPeople === 0 ? null : e.length), [available, maxPeople]);
  const ratio = useMemo(() => {
    if (maxPeople === 0) return false;
    if (weight) {
      const vals = Object.values(weight);
      if (vals.includes(Infinity)) {
        const sum_w = sum(vals.filter(e => e !== Infinity));
        if (sum_w === 0)
          return tableMap(level, e => Number(e === maxPeople));
        return tableMap(EMPTY_TABLE, (_, i, j) =>
          Number(Object.entries(value).every(([k, v]) => weight[k] !== Infinity || v.table[i][j])) *
          sum(Object.entries(value).map(([k, v]) => weight[k] === Infinity ? 0 : Number(v.table[i][j]) * weight[k])) / sum_w
        );
      } else {
        const sum_w = sum(vals);
        if (sum_w === 0)
          return false;
        else{
          return tableMap(EMPTY_TABLE, (_, i, j) =>
            sum(Object.entries(value).map(([k, v]) => Number(v.table[i][j]) * weight[k])) / sum_w);
        }
      }
    } else return tableMap(level, e => e / maxPeople);
  }, [level, maxPeople, EMPTY_TABLE, value, weight]);

  return (
    <Context.Provider value={{ focus, available, level, maxPeople, highlightRange, ratio }}>
      <TimeTable
        enter={enter}
        down={enter}
        up={up}
        leave={() => keepFocus || setFocus(null)}
        Grid={Grid}
        time={time}
        date={date}
        duration={duration}
        {...props}
      />
    </Context.Provider>
  );
}

