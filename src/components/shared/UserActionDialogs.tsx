"use client";

import { useState } from "react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { User } from "@/types/user";

interface UserActionDialogsProps {
  selectedUser: User | null;
  blockOpen: boolean;
  deleteOpen: boolean;
  adjustChipsOpen: boolean;
  transferOpen: boolean;
  onBlockClose: () => void;
  onDeleteClose: () => void;
  onAdjustChipsClose: () => void;
  onTransferClose: () => void;
  onBlockConfirm: () => void;
  onDeleteConfirm: () => void;
  onAdjustChipsConfirm: (amount: number, type: "add" | "subtract" | "set") => void;
  onTransferConfirm: (toUserId: string, amount: number) => void;
  allUsers?: User[];
}

export function UserActionDialogs({
  selectedUser,
  blockOpen,
  deleteOpen,
  adjustChipsOpen,
  transferOpen,
  onBlockClose,
  onDeleteClose,
  onAdjustChipsClose,
  onTransferClose,
  onBlockConfirm,
  onDeleteConfirm,
  onAdjustChipsConfirm,
  onTransferConfirm,
  allUsers = [],
}: UserActionDialogsProps) {
  const [chipAmount, setChipAmount] = useState("");
  const [chipType, setChipType] = useState<"add" | "subtract" | "set">("add");
  const [transferTo, setTransferTo] = useState("");
  const [transferAmount, setTransferAmount] = useState("");

  return (
    <>
      {/* Block/Unblock Dialog */}
      <AlertDialog open={blockOpen} onOpenChange={onBlockClose}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {selectedUser?.is_blocked ? "Unblock User" : "Block User"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to {selectedUser?.is_blocked ? "unblock" : "block"} user{" "}
              <strong>{selectedUser?.username}</strong>?
              {!selectedUser?.is_blocked && " They will no longer be able to login to the game."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={onBlockClose}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={onBlockConfirm}
              className={selectedUser?.is_blocked ? "bg-green-600 hover:bg-green-700" : "bg-orange-600 hover:bg-orange-700"}
            >
              {selectedUser?.is_blocked ? "Unblock" : "Block"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Dialog */}
      <AlertDialog open={deleteOpen} onOpenChange={onDeleteClose}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete User</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. Are you sure you want to permanently delete user{" "}
              <strong>{selectedUser?.username}</strong>?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={onDeleteClose}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={onDeleteConfirm} className="bg-red-600 hover:bg-red-700">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Adjust Chips Dialog */}
      <Dialog open={adjustChipsOpen} onOpenChange={onAdjustChipsClose}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adjust Chips — {selectedUser?.username}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1">
              <Label>Current Chips</Label>
              <p className="text-2xl font-bold text-indigo-700">{Number(selectedUser?.chips ?? 0).toLocaleString()}</p>
            </div>
            <div className="space-y-1">
              <Label>Operation</Label>
              <div className="flex gap-2">
                {(["add", "subtract", "set"] as const).map((t) => (
                  <button
                    key={t}
                    onClick={() => setChipType(t)}
                    className={`flex-1 py-1.5 rounded-md text-sm font-medium border transition-colors capitalize ${chipType === t ? "bg-indigo-600 text-white border-indigo-600" : "border-gray-300 text-gray-600 hover:bg-indigo-50"}`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-1">
              <Label>Amount</Label>
              <Input type="number" placeholder="Enter amount" value={chipAmount} onChange={(e) => setChipAmount(e.target.value)} min="0" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={onAdjustChipsClose}>Cancel</Button>
            <Button
              onClick={() => {
                onAdjustChipsConfirm(Number(chipAmount), chipType);
                setChipAmount("");
              }}
              disabled={!chipAmount || isNaN(Number(chipAmount))}
            >
              Apply
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Transfer Chips Dialog */}
      <Dialog open={transferOpen} onOpenChange={onTransferClose}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Transfer Chips — from {selectedUser?.username}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1">
              <Label>Transfer To (User ID)</Label>
              <Input placeholder="Recipient user ID" value={transferTo} onChange={(e) => setTransferTo(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>Amount</Label>
              <Input type="number" placeholder="Enter amount" value={transferAmount} onChange={(e) => setTransferAmount(e.target.value)} min="1" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={onTransferClose}>Cancel</Button>
            <Button
              onClick={() => {
                onTransferConfirm(transferTo, Number(transferAmount));
                setTransferTo("");
                setTransferAmount("");
              }}
              disabled={!transferTo || !transferAmount}
            >
              Transfer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
