import React from "react";

const ChatLayout = ({ children }: { children: React.ReactNode }) => {
  return (
    <div className="flex h-dvh w-full flex-col overflow-hidden">
      {children}
    </div>
  );
};

export default ChatLayout;
