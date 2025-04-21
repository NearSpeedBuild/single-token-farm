import React from "react";

const FarmContainer = ({ children, headerElement = null }) => {
  return (
    <div className="w-full h-auto relative overflow-hidden mt-4">
      {headerElement && (
        <div className="mb-4 flex justify-end">{headerElement}</div>
      )}
      <div className="w-full h-auto rounded-lg md:bg-white-600">{children}</div>
    </div>
  );
};

export default FarmContainer;
