import { Airplane, AirplaneTakeoff } from "@phosphor-icons/react";

/** 空狀態停機；搜尋中起飛。用 Phosphor，不要自己亂畫。 */
export function SearchPlane({ flying }: { flying: boolean }) {
  return (
    <div className="plane-stage" aria-hidden>
      {flying ? (
        <>
          <span className="plane-trail" />
          <AirplaneTakeoff className="plane-fly" size={72} weight="fill" />
        </>
      ) : (
        <>
          <Airplane className="plane-parked" size={72} weight="fill" />
          <span className="plane-runway" />
        </>
      )}
    </div>
  );
}
