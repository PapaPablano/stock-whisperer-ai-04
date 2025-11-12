import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PlusCircle, MoreHorizontal, Trash2, Edit } from "lucide-react";
import { useWatchlistStore, type Watchlist } from "@/hooks/useWatchlists";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { Link } from "react-router-dom";

const Watchlists = () => {
  const { watchlists, createWatchlist, deleteWatchlist, renameWatchlist } = useWatchlistStore();
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [newWatchlistName, setNewWatchlistName] = useState("");

  const [renameDialogOpen, setRenameDialogOpen] = useState(false);
  const [renamingWatchlist, setRenamingWatchlist] = useState<Watchlist | null>(null);
  const [editedWatchlistName, setEditedWatchlistName] = useState("");

  const handleCreateWatchlist = () => {
    if (newWatchlistName.trim()) {
      createWatchlist(newWatchlistName.trim());
      setNewWatchlistName("");
      setCreateDialogOpen(false);
    }
  };

  const handleRenameClick = (watchlist: Watchlist) => {
    setRenamingWatchlist(watchlist);
    setEditedWatchlistName(watchlist.name);
    setRenameDialogOpen(true);
  };

  const handleSaveRename = () => {
    if (renamingWatchlist && editedWatchlistName.trim()) {
      renameWatchlist(renamingWatchlist.id, editedWatchlistName.trim());
      setRenameDialogOpen(false);
      setRenamingWatchlist(null);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <header className="flex justify-between items-center mb-8">
        <h1 className="text-4xl font-bold tracking-tight text-gray-900 dark:text-gray-50">
          AI-Powered Watchlists
        </h1>
        <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <PlusCircle className="mr-2 h-4 w-4" /> Create New Watchlist
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create a new watchlist</DialogTitle>
            </DialogHeader>
            <Input
              placeholder="Watchlist name (e.g. 'My Top Picks')"
              value={newWatchlistName}
              onChange={(e) => setNewWatchlistName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleCreateWatchlist()}
            />
            <DialogFooter>
              <Button onClick={handleCreateWatchlist}>Create</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </header>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {watchlists.map((watchlist) => (
          <Link to={`/watchlists/${watchlist.id}`} key={watchlist.id} className="block">
            <Card className="h-full hover:shadow-lg transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-lg font-medium">
                  {watchlist.name}
                </CardTitle>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild onClick={(e) => e.preventDefault()}>
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={(e) => { e.preventDefault(); handleRenameClick(watchlist); }}>
                      <Edit className="mr-2 h-4 w-4" />
                      Rename
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={(e) => { e.preventDefault(); deleteWatchlist(watchlist.id); }}
                      className="text-red-500"
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {watchlist.symbols.length}
                  <span className="text-sm font-normal text-muted-foreground"> stocks</span>
                </div>
                <div className="flex -space-x-2 overflow-hidden mt-4">
                  {watchlist.symbols.slice(0, 5).map((symbol) => (
                    <div 
                      key={symbol}
                      className="inline-block h-8 w-8 rounded-full bg-muted text-muted-foreground flex items-center justify-center text-xs font-bold ring-2 ring-background"
                    >
                      {symbol.slice(0, 4)}
                    </div>
                  ))}
                  {watchlist.symbols.length > 5 && (
                    <div className="inline-block h-8 w-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold ring-2 ring-background">
                      +{watchlist.symbols.length - 5}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}

        <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
          <DialogTrigger asChild>
            <Card className="border-dashed border-2 flex items-center justify-center hover:border-primary transition-colors cursor-pointer">
              <div className="text-lg text-muted-foreground">
                <PlusCircle className="mr-2 h-5 w-5 inline-block" />
                Add New Watchlist
              </div>
            </Card>
          </DialogTrigger>
        </Dialog>
      </div>

      {/* Rename Watchlist Dialog */}
      <Dialog open={renameDialogOpen} onOpenChange={setRenameDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename '{renamingWatchlist?.name}'</DialogTitle>
          </DialogHeader>
          <Input
            placeholder="Enter new watchlist name"
            value={editedWatchlistName}
            onChange={(e) => setEditedWatchlistName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSaveRename()}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRenameDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveRename}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Watchlists;
