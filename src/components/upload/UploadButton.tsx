import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { UploadModal } from "./UploadModal";
import { motion } from "framer-motion";

export function UploadButton() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <motion.div
        className="fixed bottom-8 right-8 z-50"
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: "spring", stiffness: 260, damping: 20 }}
      >
        <Button
          size="lg"
          onClick={() => setOpen(true)}
          className="h-14 w-14 rounded-full shadow-elevated"
        >
          <Plus className="h-6 w-6" />
          <span className="sr-only">Upload Invoice</span>
        </Button>
      </motion.div>
      <UploadModal open={open} onOpenChange={setOpen} />
    </>
  );
}
