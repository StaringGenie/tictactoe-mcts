class Node {
    constructor(state, node) {
        if (arguments.length === 1) {
            this.state = state;
            this.parent;
            this.childArray = [];
        } else if (arguments.length === 2) {
            this.state = new State(null, node.state);
            if (node.parent !== (null || undefined)) {
                this.parent = node.parent;
            }
            this.childArray = [];
            node.childArray.forEach(child => {
                this.childArray.push(new Node(null, child));
            })
        } else {
            this.state = new State();
            this.parent;
            this.childArray = [];
        }

    }

    getRandomChildNode() {
        return this.childArray[Math.floor(Math.random() * this.childArray.length)];
    }

    getChildWithMaxScore() {
        let arrScore = [];
        for (var i = 0; i < this.childArray.length; i++) {
            arrScore.push(this.childArray[i].state.visitCount);
        }
        var largest = Math.max(...arrScore);
        var idx = arrScore.indexOf(largest);
        return this.childArray[idx];
    }
}

class Tree {
    constructor(node) {
        if (arguments.length === 1) {
            this.root = node;
        } else {
            this.root = new Node();
        }
    }
}

class State {
    constructor(board, state) {
        if (arguments.length === 1) {
            this.board = new Board(board);
            this.playerNo;
            this.visitCount = 0;
            this.winScore = 10;
        } else if (arguments.length === 2) {
            this.board = new Board(state.board);
            this.playerNo = state.playerNo;
            this.visitCount = state.visitCount;
            this.winScore = state.winScore;
        } else {
            this.board = new Board();
            this.playerNo;
            this.visitCount = 0;
            this.winScore = 10;
        }

    }

    /**
     * Get all possible future states of a board
     */
    getAllPossibleStates() {
        let possibleStates = [];
        let availablePositions = this.board.getEmptyPositions();

        availablePositions.forEach(p => {
            let newState = new State(this.board);
            newState.playerNo = 3 - this.playerNo;
            newState.board.performMove(newState.playerNo, p);
            possibleStates.push(newState);
        })

        return possibleStates;
    }


    randomPlay() {
        let availablePositions = this.board.getEmptyPositions();
        let totalPossibilities = availablePositions.length;
        let rdm = Math.floor(Math.random() * totalPossibilities);
        this.board.performMove(this.playerNo, availablePositions[rdm]);
    }


    togglePlayer() {
        this.playerNo = 3 - this.playerNo;
    }


    getOpponent() {
        return 3 - this.playerNo;
    }

    addScore(score) {
        if (this.winScore !== Number.MIN_SAFE_INTEGER) {
            this.winScore += score;
        }
    }
}

class Board {

    constructor(board) {
        if (arguments.length === 1) {
            this.boardValues = board.boardValues.slice();
        } else {
            this.boardValues = new Array(9);
            for (var i = 0; i < this.boardValues.length; i++) {
                this.boardValues[i] = 0;
            }
        }
        this.DEFAULT_BOARD_SIZE = 3;
        this.IN_PROGRESS = -1;
        this.DRAW = 0;
        this.P1 = 1;
        this.P2 = 2;
        this.totalMoves = 0;
    }


    performMove(player, p) {
        this.totalMoves++;
        this.boardValues[p] = player;
    }

    getEmptyPositions() {
        let size = this.boardValues.length;
        let emptyPositions = [];
        for (var i = 0; i < size; i++) {
            if (this.boardValues[i] === 0) {
                emptyPositions.push(i);
            }
        }
        return emptyPositions;
    }

    /**
     * -1  - game incomplete
     *  0  - draw
     *  1  - player 1 wins
     *  2  - player 2 wins
     */
    checkStatus() {
        let checks = [
            [0, 1, 2],
            [3, 4, 5],
            [6, 7, 8],
            [0, 3, 6],
            [1, 4, 7],
            [2, 5, 8],
            [0, 4, 8],
            [2, 4, 6]
        ];

        for (var i = 0; i < checks.length; i++) {
            let check = checks[i];
            let checkArr = [];
            for (var j = 0; j < check.length; j++) {
                checkArr.push(this.boardValues[check[j]]);

            }

            function winner1(currentValue) {
                return currentValue === 1;
            }

            function winner2(currentValue) {
                return currentValue === 2;
            }
            if (checkArr.every(winner1)) {
                return 1;
            }
            if (checkArr.every(winner2)) {
                return 2;
            }
        }

        function incomplete(elem) {
            return elem === 0;
        }
        if (this.boardValues.some(incomplete)) {
            return -1
        }

        // if there are no empty spaces, the game is a draw
        return 0;
    }
}

let MonteCarloTreeSearch = {

    findNextMove: (board, playerNo) => {
        let opponent = 3 - playerNo;
        let tree = new Tree();
        let rootNode = tree.root;
        let loopTime = 100;
        rootNode.state.board = new Board(board);
        rootNode.state.playerNo = opponent;

        let startTime = Date.now();
        while ((Date.now() - startTime) < loopTime) {
            let promisingNode = selectPromisingNode(rootNode);
            // if status of board is -1, game has not finished yet
            if (promisingNode.state.board.checkStatus() === board.IN_PROGRESS) {
                expandNode(promisingNode);
            }
            let nodeToExplore = promisingNode;
            if (nodeToExplore.childArray.length > 0) {
                nodeToExplore = promisingNode.getRandomChildNode();
            }
            let playoutResult = simulateRandomPlayout(nodeToExplore, opponent);
            backPropogation(nodeToExplore, playoutResult);
        }

        let winnerNode = rootNode.getChildWithMaxScore();
        tree.root = winnerNode;
        return winnerNode.state.board;
    }
}

/**
 * Selection Phase
 * Starting with the root node, picks the node with the maximum win rate
 */

let selectPromisingNode = (rootNode) => {
    let node = rootNode;
    while (node.childArray.length !== 0) {
        node = UCT.findBestNodeWithUCT(node);
    }
    return node;
}

let UCT = {

    uctValue: (totalVisit, nodeWinScore, nodeVisit) => {
        if (nodeVisit === 0) {
            return Number.MAX_SAFE_INTEGER;
        }
        return (nodeWinScore / nodeVisit) + 1.41 * Math.sqrt(Math.log(totalVisit) / nodeVisit);
    },

    findBestNodeWithUCT: (node) => {
        let parentVisit = node.state.visitCount;
        let childUCT = [];

        node.childArray.forEach(child => {
            childUCT.push(UCT.uctValue(parentVisit, child.state.winScore, child.state.visitCount))
        })
        var max = Math.max(...childUCT);
        var idx = childUCT.indexOf(max);
        return node.childArray[idx];
    }
}

let expandNode = (node) => {
    let possibleStates = node.state.getAllPossibleStates();
    possibleStates.forEach(state => {
        let newNode = new Node(state);
        newNode.parent = node;
        newNode.state.playerNo = node.state.getOpponent();
        node.childArray.push(newNode);
    })
}

let backPropogation = (nodeToExplore, playerNo) => {
    let tempNode = nodeToExplore;
    while (tempNode !== undefined) {
        tempNode.state.visitCount++;
        if (tempNode.state.playerNo === playerNo) {
            tempNode.state.addScore(1);
        }
        tempNode = tempNode.parent;
    }
}

let simulateRandomPlayout = (node, opponent) => {

    let tempNode = new Node(null, node);
    let tempState = tempNode.state;
    let boardStatus = tempState.board.checkStatus();

    if (boardStatus === opponent) {
        tempNode.parent.state.winScore = Number.MIN_SAFE_INTEGER;
        return boardStatus;
    }
    while (boardStatus === -1) {
        tempState.togglePlayer();
        tempState.randomPlay();
        boardStatus = tempState.board.checkStatus();
    }
    return boardStatus;
}

class MCTS_GAME {
    constructor() {
        this.mcts = MonteCarloTreeSearch
        this.board = new Board();
        this.player = 2;
        this.totalMoves = 9;
        this.status = 1;
    }
    move(value, board) {
        this.board.performMove(1, value)
        if (this.checkStatus() === -1) {
            this.board = this.mcts.findNextMove(this.board, 2)
            this.checkStatus()
        }

    }

    checkStatus() {
        for (let i = 0; i < 9; i++) {
            if (this.board.boardValues[i] !== 0) {
                let key = this.board.boardValues[i] === 1 ? 'x' : 'o'
                jQuery(".cell").eq(i).text(key);
            }

        }
        if (this.board.checkStatus() !== -1) {
            let winStatus = this.board.checkStatus();
            if (winStatus === 0) {
                alert("Ничья")
            } else if (winStatus === 1) {
                alert("Вы победили")
            } else {
                alert("Вы проиграли")
            }
            this.status = 0;
            return winStatus
        }
        return -1
    }
}

let simulateAiPlay = () => {
    let mcts = new MCTS_GAME()
    let player = 2;
    let totalMoves = 9;

    for (var i = 0; i < 9; i++) {
        mcts.board = mcts.mcts.findNextMove(mcts.board, player);
        mcts.checkStatus()
        if (mcts.board.checkStatus() !== -1) {
            break;
        }
        player = 3 - player;
    }
    let winStatus = mcts.board.checkStatus();
    return winStatus;
}

jQuery(document).ready(function() {
    mcts = new MCTS_GAME()
    if (mcts.status !== 0)
        jQuery(".cell").on("click", function() {
            var cell_text = jQuery(this).text();
            if (cell_text != "")
                alert("занято");
            else {
                mcts.move(jQuery(this).index() - 1, mcts.board)

            }
        });

})